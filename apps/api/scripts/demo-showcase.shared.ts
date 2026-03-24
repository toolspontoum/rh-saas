export const DEMO_MARKER = "[DEMO SHOWCASE]";
export const DEMO_PASSWORD = "0123teste";
export const DEMO_TENANT_SLUG = "vvconsulting-mvp";

export type DemoRole = "admin" | "manager" | "analyst" | "employee";

export type DemoUser = {
  key: string;
  email: string;
  fullName: string;
  role?: DemoRole;
  cpf?: string;
  phone?: string;
  department?: string;
  positionTitle?: string;
  contractType?: string;
  baseSalary?: number;
  employeeTags?: string[];
};

export const DEMO_USERS: DemoUser[] = [
  {
    key: "admin",
    email: "demo.admin@vvconsulting.local",
    fullName: "Demo Admin",
    role: "admin",
    cpf: "11111111111",
    phone: "11910000001",
    department: "Diretoria",
    positionTitle: "Administrador",
    contractType: "CLT",
    baseSalary: 18000,
    employeeTags: ["gestao", "backoffice"]
  },
  {
    key: "rh",
    email: "demo.rh@vvconsulting.local",
    fullName: "Demo RH",
    role: "manager",
    cpf: "22222222222",
    phone: "11910000002",
    department: "RH",
    positionTitle: "Gestor RH",
    contractType: "CLT",
    baseSalary: 12000,
    employeeTags: ["rh", "operacoes"]
  },
  {
    key: "analyst",
    email: "demo.analyst@vvconsulting.local",
    fullName: "Demo Analyst",
    role: "analyst",
    cpf: "33333333333",
    phone: "11910000003",
    department: "Operacoes",
    positionTitle: "Analista",
    contractType: "CLT",
    baseSalary: 9000,
    employeeTags: ["analytics", "suporte"]
  },
  {
    key: "employee1",
    email: "demo.employee1@vvconsulting.local",
    fullName: "Roberto Pereira",
    role: "employee",
    cpf: "44444444444",
    phone: "11970739875",
    department: "Desenvolvimento",
    positionTitle: "Desenvolvedor Senior",
    contractType: "CLT",
    baseSalary: 15000,
    employeeTags: ["php", "excel", "lideranca"]
  },
  {
    key: "employee2",
    email: "demo.employee2@vvconsulting.local",
    fullName: "Marina Costa",
    role: "employee",
    cpf: "45678912345",
    phone: "11960001122",
    department: "Operacoes",
    positionTitle: "Supervisor de Campo",
    contractType: "PJ",
    baseSalary: 9800,
    employeeTags: ["operacao", "field", "sobreaviso"]
  },
  {
    key: "candidate1",
    email: "demo.candidate1@vvconsulting.local",
    fullName: "Joao Silva"
  },
  {
    key: "candidate2",
    email: "demo.candidate2@vvconsulting.local",
    fullName: "Ana Souza"
  },
  {
    key: "candidate3",
    email: "demo.candidate3@vvconsulting.local",
    fullName: "Carlos Lima"
  }
];

export const DEMO_CANDIDATE_KEYS = ["candidate1", "candidate2", "candidate3"] as const;
export const DEMO_EMPLOYEE_KEYS = ["employee1", "employee2"] as const;

export function emailSlug(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
