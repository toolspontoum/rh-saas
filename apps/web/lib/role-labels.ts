export function roleLabel(role: string): string {
  const normalized = role.trim().toLowerCase();
  if (normalized === "owner") return "Owner";
  if (normalized === "admin") return "Admin";
  if (normalized === "manager") return "RH";
  if (normalized === "analyst") return "Analista";
  if (normalized === "employee") return "Colaborador";
  if (normalized === "viewer") return "Visualizador";
  if (normalized === "preposto") return "Preposto";
  if (!normalized) return "-";
  return role;
}

export function formatRoleList(roles: string[]): string {
  return roles.map(roleLabel).join(", ");
}
