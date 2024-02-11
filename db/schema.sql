create table file (
    id bigserial primary key,
    path text not null unique
);

create table snippet (
    id bigserial primary key,
    file_id bigint not null references file on delete cascade,
    content text not null,

    -- 768 to support model
    -- https://huggingface.co/aident-ai/bge-base-en-onnx
    embedding vector(768)
);
