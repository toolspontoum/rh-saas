# CHECKLIST_FECHAMENTO_EFETIVO_20260319.md

## Fonte única de verdade (a partir de agora)
Este arquivo substitui qualquer controle paralelo para o fechamento desta fase.

## Objetivo de fechamento
Finalizar com previsibilidade:
1. Sobreaviso 100% funcional (admin + funcionário + espelhamento com ponto)
2. Povoamento demo completo (repetível e limpável)
3. Ambiente pronto para demonstração sem retrabalho

## Estado real confirmado no código (sem opinião)
- Backend de `oncall-shifts` já existe:
  - service: create/list/detail/update/delete/ack/register-entry
  - handlers e rotas `/v1/tenants/:tenantId/oncall-shifts/*`
- Frontend de sobreaviso já existe em:
  - `apps/web/app/tenants/[tenantId]/oncall/page.tsx`
  - `apps/web/app/tenants/[tenantId]/oncall/[oncallShiftId]/page.tsx`
- Migration de `oncall_shifts` já foi aplicada no remoto anteriormente.
- Script de povoamento principal ainda NÃO existe:
  - falta `apps/api/scripts/seed-demo-showcase.ts`
  - faltam scripts npm para seed/cleanup demo no `apps/api/package.json`

## O que falta (ordem fechada, sem voltar etapa)

### F1) Estabilizar Sobreaviso (payload inválido + UX de cadastro)
Status: PENDENTE
Entrega:
- Corrigir erro "Payload da requisição inválido" na listagem/filtros da tela de sobreaviso.
- Garantir lista de colaboradores carregando no modal.
- Colaborador no modal com busca (nome/e-mail/CPF), sem botões duplicados.
Critério de pronto:
- Página abre sem erro.
- Cadastrar sobreaviso funciona.
- Filtros retornam dados esperados.

### F2) Fechar consistência do fluxo admin/funcionário em sobreaviso
Status: PENDENTE
Entrega:
- Admin cadastra/edita/exclui.
- Funcionário recebe notificação, dá ciente, registra entrada.
- Registro de entrada vincula corretamente ao ponto (sem duplicidade indevida).
Critério de pronto:
- Um ciclo completo (criar -> ciente -> entrada -> detalhe) validado manualmente.

### F3) Script de povoamento demo completo e repetível
Status: PENDENTE
Entrega:
- Criar `apps/api/scripts/seed-demo-showcase.ts`.
- Adicionar scripts npm:
  - `seed:demo:showcase`
  - `seed:demo:cleanup`
- Popular:
  - vagas, candidatos, funcionários, pontos, solicitações/aceites, sobreavisos, contracheques, comunicados.
- Senha padrão: `0123teste`.
Critério de pronto:
- Rodar seed 1x com sucesso.
- Rodar cleanup com sucesso.
- Rodar seed novamente sem erro.

### F4) Entrega para demonstração
Status: PENDENTE
Entrega:
- Lista final de logins criada.
- Comandos finais de subida local documentados.
- Validação de build API/Web.
Critério de pronto:
- Você consegue abrir e navegar com usuários distintos sem bloqueio.

## Regras anti-loop de execução
- Não reabrir diagnóstico já fechado.
- Cada fase só avança com evidência objetiva (arquivo alterado + comando rodado + resultado).
- Se surgir erro novo, corrigir no mesmo momento; não abrir nova frente.
- Atualizar `docs/agent.md` a cada fase concluída.

## ETA realista restante
- F1 + F2: 60 a 120 min
- F3: 60 a 120 min
- F4: 20 a 30 min
- Total: 2h20 a 4h30

## Próxima ação imediata
Executar F1 agora e só parar quando a tela de sobreaviso estiver sem o erro de payload e com cadastro funcional.

