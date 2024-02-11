import { pipeline } from '@xenova/transformers';
import pg from 'pg';
import pgvector from 'pgvector/pg';

const client = new pg.Client({
  user: 'postgres'
})
await client.connect()

await pgvector.registerType(client);

const generateEmbedding = await pipeline(
  'feature-extraction',
  'aident-ai/bge-base-en-onnx'
)

const genEmbed = (text) => generateEmbedding(text, {
  pooling: 'mean',
  normalize: true,
})

const files = [
  {
    path: 'internal/service/treatmenttemplate/treatement_template.go',
    snippets: [
      `func (s *Service) DeleteTreatmentTemplate(ctx context.Context, creatorID ty.TherapistID, ID ty.TreatmentTemplateID) error {
      	if err := s.provider.DeleteTreatmentTemplate(ctx, creatorID, ID.Int64()); err != nil {
      		if errors.Is(err, database.ErrNothingUpdated) {
      			return ty.ErrNotFound
      		}
      		return err
      	}

      	return nil
       }`,
      `func mapExercisesRequestToRows(treatmentTemplateID ty.TreatmentTemplateID, x []UpsertExerciseRequest) []table.TreatmentTemplateExercises {
        	return lo.Map(
        		x,
        		func(createExerciseRequest UpsertExerciseRequest, _index int) table.TreatmentTemplateExercises {
        			return table.TreatmentTemplateExercises{
        				TreatmentTemplateID:      treatmentTemplateID,
        				ExerciseID:               ty.ExerciseID(createExerciseRequest.ExerciseID),
        				IntroductionProtocolWeek: createExerciseRequest.IntroductionProtocolWeek,
        				EndProtocolWeek:          createExerciseRequest.EndProtocolWeek,
        			}
        		},
        	)
       }`,
    ]
  }
]

await client.query('delete from file')

for (const { path, snippets } of files) {
  const { rows: [{ id: fileId }] } = await client.query(`
    insert into file(path)
    values ($1)
    returning id`,
    [path]
  );
  console.log({ fileId })

  for (const snippet of snippets) {
    const { data: embedding } = await genEmbed(snippet)
    const sqlEmbedding = pgvector.toSql(Array.from(embedding))

    await client.query(`
      insert into snippet(file_id, content, embedding)
      values ($1, $2, $3)`,
      [fileId, snippet, sqlEmbedding]
    )
  }
}

const test = async (prompt) => {
  const { data: promptEmbedding } = await genEmbed(prompt)
  const sqlEmbedding = pgvector.toSql(Array.from(promptEmbedding))

  const { rows } = await client.query(`
    select embedding <-> $1 as distance, left(content, 30) as snippet
    from snippet
    order by 1 asc`,
    [sqlEmbedding]
  )

  console.log(prompt)
  console.table(rows)
}

await test('what error is returned from the delete function in the template service?')
await test('what time is it?')
await test('in which file can i find DeleteTreatmentTemplate?')
await test('which fields are mapped from exercise requests?')
await test('show me a go lang function')
await test('show me a ruby function')

client.end()
