#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): formatea con Prettier y corrige con ESLint
# el archivo que Claude acaba de crear o editar dentro de Arcade Vault.

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file="$(jq -r '.tool_input.file_path // empty')"

# Solo archivos existentes dentro del proyecto.
[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  "$project_dir"/*) ;;
  *) exit 0 ;;
esac

cd "$project_dir" || exit 0

# Compactar: elimina las líneas en blanco (o solo con espacios) en archivos de código.
case "$file" in
  *.js | *.jsx | *.ts | *.tsx | *.mjs | *.cjs | *.css)
    perl -i -ne 'print unless /^\s*$/' "$file"
    ;;
esac

# Prettier: respeta .prettierignore y omite tipos que no conoce.
npx --no-install prettier --write --ignore-unknown --log-level warn "$file" >&2

# ESLint: solo código JS/TS.
case "$file" in
  *.js | *.jsx | *.ts | *.tsx | *.mjs | *.cjs)
    if ! output="$(npx --no-install eslint --fix "$file" 2>&1)"; then
      echo "ESLint encontró problemas en $file:" >&2
      echo "$output" >&2
      exit 2
    fi
    ;;
esac

exit 0
