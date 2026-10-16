// Remplace les variables {{name}} / {{email}} dans un texte de template.
export function render(text, vars = {}) {
  return String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : ''
  );
}
