# PLANO_EFETIVO_EXECUCAO_20260319.md

## Objetivo
Encerrar sem retrabalho os itens pendentes do projeto, com foco em:
1) modulo de Sobreaviso (fluxo novo completo)
2) seed de povoamento demo para apresentacao

## Regra de Execucao (anti-loop)
- Nao revalidar arquivos ja mapeados, exceto se a task exigir alteracao direta neles.
- Executar em ordem fechada (T1 -> T8) sem voltar etapa.
- So considerar uma task concluida com: codigo aplicado + build ok + registro no docs/agent.md.

## Estado Atual Consolidado
### Concluido
- T1 Freeze do legado de sobreaviso e navegacao para `/oncall`.
- T2 Migration de dominio `oncall_shifts` + eventos + vinculo com `time_entries`.
- T3 Contratos (types + zod) do novo dominio.
- T4 Repository do novo dominio (`oncall_shifts`).
- Hotfixes de tela sobreaviso: busca de colaborador e pageSize invalido.
- Push remoto da migration `oncall_shifts` realizado.

### Pendente (o que falta de verdade)
- T5 Service novo de sobreaviso com regras de negocio finais.
- T6 Handlers + rotas novas (`/oncall-shifts/*`) sem concorrencia com legado.
- T7 Frontend admin final: CRUD completo + filtros + detalhe.
- T8 Frontend employee final: lista propria + ciente + registrar entrada + detalhe.
- T9 Integracao total com ponto (espelhamento e vinculacao robusta no detalhe).
- T10 Seed demo showcase completo (vagas/candidatos/funcionarios/ponto/ajustes/sobreaviso/contracheques/comunicados).

## Backlog Objetivo (curto e executavel)
1. Implementar T5 (service)
   - create/list/detail/update/delete shift
   - acknowledge
   - register entry (link com ponto)
   - notificacoes para colaborador/admin
2. Implementar T6 (handlers/routes)
   - endpoints novos ativos
   - legados mantidos so como compatibilidade minima
3. Implementar T7 e T8 no frontend
   - remover gaps de UX restantes
4. Implementar T9 (espelho completo no detalhe de sobreaviso)
5. Implementar T10 (seed-demo-showcase.ts + scripts npm)
6. Build final api/web + log final em docs/agent.md

## Estimativa Realista Restante
- Sobreaviso (T5..T9): 2h30 a 4h
- Seed demo (T10): 40 a 70 min
- Validacao + docs: 20 a 30 min
- Total: 3h30 a 5h40

## Saida por checkpoint (para nao perder contexto)
- CP1: Backend sobreaviso final (T5+T6)
- CP2: Frontend sobreaviso final (T7+T8+T9)
- CP3: Seed demo completo e lista de logins (T10)

## Proximo passo imediato
Iniciar T5 (service de sobreaviso) e so parar apos build `apps/api` verde.
