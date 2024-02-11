{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs {
        inherit system;
      };
    in
    {
      devShell = pkgs.mkShell {
        buildInputs = [
          pkgs.pgcli
          pkgs.bun
          pkgs.nodejs_21
          # switch deno or bun once transformers v3 is available
          # https://github.com/xenova/transformers.js/pull/545
        ];

        shellHook = ''
          cp -n .env.example .env
          set -a
          source .env
          set +a
        '';
      };
    }
  );
}
