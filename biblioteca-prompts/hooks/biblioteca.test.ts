import { expect, test } from 'claude-code/testing'

const PAINEL = {
  plugin: 'biblioteca-prompts',
  component: 'Pane',
  requestId: 'biblioteca-prompts',
  props: {
    title: '📚 Prompts',
    isFocused: false,
    bodyColumns: 48,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 48, rows: 50 },
} as const

const SUPERFICIES = ['terminal', 'desktop'] as const

const SEMENTE = [
  {
    id: 'p1',
    titulo: 'Commit e envio',
    texto: 'Faça o commit, suba a versão e envie ao GitHub.',
    pasta: 'Git',
  },
  {
    id: 'p2',
    titulo: 'Português',
    texto: 'Responda em português-BR.',
    pasta: 'Geral',
  },
]

type Responder = {
  on: (evento: string, hook: (...args: any[]) => unknown) => unknown
}

// Faz o papel do motor: responde as chamadas que o painel faz em `$`.
function responder(
  on: Responder['on'],
  preenchidos: { text: string; mode?: string }[] = [],
  avisos: string[] = [],
  caixaAceita = true,
) {
  on('command.register', () => ({ value: { command: 'biblioteca' } }))
  on('prompt.fill', (_: unknown, e: { text: string; mode?: string }) => {
    preenchidos.push({ text: e.text, mode: e.mode })
    return { isFilled: caixaAceita }
  })
  on('ui.toast', (_: unknown, e: { text: string }) => {
    avisos.push(e.text)
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
}

// Armazenamento em memória no lugar de `$.store`. Devolve os dados para o teste
// conferir o que o painel gravou.
function armazenar(
  on: Responder['on'],
  inicial: Record<string, unknown> = {},
): Record<string, unknown> {
  const dados: Record<string, unknown> = { ...inicial }
  on('store.get', (_: unknown, e: { key: string }) => ({ value: dados[e.key] }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => {
    dados[e.key] = JSON.parse(JSON.stringify(e.value))
    return { value: undefined }
  })
  on('store.delete', (_: unknown, e: { key: string }) => {
    delete dados[e.key]
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(dados) }))

  return dados
}

const iniciar = ($: any) =>
  $.session.start({ cwd: 'C:/proj', surface: 'desktop', isInteractive: true })

test('sem prompts salvos, o painel convida a criar o primeiro', async ($, on) => {
  responder(on)
  armazenar(on)
  await iniciar($)

  for (const surface of SUPERFICIES) {
    const ui = await $.ui.mount({ ...PAINEL, surface })

    expect(await ui.find({ type: 'Text', text: /Biblioteca/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /0 prompts/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Nenhum prompt salvo/ })).toBeDefined()
    expect(await ui.find({ key: 'novo' })).toBeDefined()
    await ui.unmount()
  }
})

test('os prompts guardados aparecem com título, pasta e primeira linha', async ($, on) => {
  responder(on)
  armazenar(on, { itens: SEMENTE })
  await iniciar($)

  for (const surface of SUPERFICIES) {
    const ui = await $.ui.mount({ ...PAINEL, surface })

    expect(await ui.find({ type: 'Text', text: /2 prompts/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Commit e envio/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Git · Faça o commit/ })).toBeDefined()
    expect(await ui.find({ key: 'ins:p2' })).toBeDefined()
    // Com duas pastas, os botões de pasta aparecem.
    expect(await ui.find({ key: 'pasta:Git' })).toBeDefined()
    expect(await ui.find({ key: 'pasta:' })).toBeDefined()
    await ui.unmount()
  }
})

test('clicar em um prompt insere o texto na caixa, sem enviar', async ($, on) => {
  const preenchidos: { text: string; mode?: string }[] = []
  responder(on, preenchidos)
  armazenar(on, { itens: SEMENTE })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'ins:p2' })
  expect(preenchidos).toEqual([
    { text: 'Responda em português-BR.', mode: 'insert' },
  ])
  await ui.unmount()
})

test('um prompt de várias linhas mostra a primeira e insere todas', async ($, on) => {
  const preenchidos: { text: string; mode?: string }[] = []
  responder(on, preenchidos)
  armazenar(on, {
    itens: [
      { id: 'p1', titulo: 'Revisão', texto: 'linha um\nlinha dois', pasta: 'Geral' },
    ],
  })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /linha um/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /linha dois/ })).toBeUndefined()
  await ui.press({ key: 'ins:p1' })
  expect(preenchidos[0]?.text).toBe('linha um\nlinha dois')
  await ui.unmount()
})

test('se a caixa de prompt recusar, o painel avisa e não quebra', async ($, on) => {
  const avisos: string[] = []
  responder(on, [], avisos, false)
  armazenar(on, { itens: SEMENTE })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'ins:p1' })
  expect(avisos).toEqual(['A caixa de prompt não aceitou o texto.'])
  expect(await ui.find({ key: 'ins:p1' })).toBeDefined()
  await ui.unmount()
})

test('um prompt novo é salvo na lista e no armazenamento', async ($, on) => {
  const avisos: string[] = []
  responder(on, [], avisos)
  const dados = armazenar(on)
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'novo' })
  expect(await ui.find({ type: 'Text', text: /Novo prompt/ })).toBeDefined()

  // Cada campo leva um rótulo que fica visível mesmo com o campo preenchido.
  expect(JSON.stringify(await ui.find({ key: 'f-titulo' }))).toContain('Título')
  expect(JSON.stringify(await ui.find({ key: 'f-pasta' }))).toContain('Pasta')
  expect(JSON.stringify(await ui.find({ key: 'f-texto' }))).toContain('Texto')

  await ui.input({ key: 'f-titulo', text: 'Commit', kind: 'change' })
  await ui.input({ key: 'f-pasta', text: 'Git', kind: 'change' })
  await ui.input({ key: 'f-texto', text: 'Faça o commit.', kind: 'change' })
  await ui.press({ key: 'salvar' })

  expect(dados.itens).toEqual([
    { id: 'p1', titulo: 'Commit', texto: 'Faça o commit.', pasta: 'Git' },
  ])
  expect(avisos).toEqual(['Prompt salvo.'])
  // O formulário fecha e o prompt entra na lista.
  expect(await ui.find({ type: 'Text', text: /Novo prompt/ })).toBeUndefined()
  expect(await ui.find({ key: 'ins:p1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 prompt$/ })).toBeDefined()
  await ui.unmount()
})

test('sem título, o painel usa o começo do texto; sem pasta, usa Geral', async ($, on) => {
  responder(on)
  const dados = armazenar(on)
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'novo' })
  await ui.input({
    key: 'f-texto',
    text: 'Explique este erro passo a passo, em português simples',
    kind: 'change',
  })
  await ui.input({
    key: 'f-texto',
    text: 'Explique este erro passo a passo, em português simples',
    kind: 'submit',
  })

  const [item] = dados.itens as {
    titulo: string
    pasta: string
  }[]
  expect(item?.pasta).toBe('Geral')
  expect(item?.titulo).toBe('Explique este erro passo a pa…')
  await ui.unmount()
})

test('texto vazio não salva e avisa', async ($, on) => {
  const avisos: string[] = []
  responder(on, [], avisos)
  const dados = armazenar(on)
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'novo' })
  await ui.input({ key: 'f-titulo', text: 'Só título', kind: 'change' })
  await ui.press({ key: 'salvar' })

  expect(avisos).toEqual(['Escreva o texto do prompt.'])
  expect(dados.itens).toBeUndefined()
  // O formulário continua aberto, com o que a pessoa digitou.
  expect(await ui.find({ type: 'Text', text: /Novo prompt/ })).toBeDefined()
  await ui.unmount()
})

test('editar muda o prompt no lugar, sem criar outro', async ($, on) => {
  const avisos: string[] = []
  responder(on, [], avisos)
  const dados = armazenar(on, { itens: SEMENTE })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'edt:p2' })
  expect(await ui.find({ type: 'Text', text: /Editar prompt/ })).toBeDefined()

  await ui.input({ key: 'f-texto', text: 'Responda sempre em português-BR.', kind: 'change' })
  await ui.input({ key: 'f-texto', text: 'Responda sempre em português-BR.', kind: 'submit' })

  const guardados = dados.itens as { id: string; texto: string; titulo: string }[]
  expect(guardados.length).toBe(2)
  expect(guardados.find(i => i.id === 'p2')?.texto).toBe('Responda sempre em português-BR.')
  expect(guardados.find(i => i.id === 'p2')?.titulo).toBe('Português')
  expect(avisos).toEqual(['Prompt atualizado.'])
  await ui.unmount()
})

test('apagar pede duas pressões', async ($, on) => {
  responder(on)
  const dados = armazenar(on, { itens: SEMENTE })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'del:p1' })
  expect(await ui.find({ type: 'Text', text: /apagar\?/ })).toBeDefined()
  expect((dados.itens as unknown[]).length).toBe(2)

  await ui.press({ key: 'del:p1' })
  expect(await ui.find({ key: 'ins:p1' })).toBeUndefined()
  expect(await ui.find({ key: 'ins:p2' })).toBeDefined()
  expect((dados.itens as unknown[]).length).toBe(1)
  await ui.unmount()
})

test('a pesquisa filtra, e Enter insere o primeiro resultado e limpa a pesquisa', async ($, on) => {
  const preenchidos: { text: string; mode?: string }[] = []
  const avisos: string[] = []
  responder(on, preenchidos, avisos)
  armazenar(on, { itens: SEMENTE })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.input({ key: 'busca', text: 'PORTUGU', kind: 'change' })
  expect(await ui.find({ key: 'ins:p1' })).toBeUndefined()
  expect(await ui.find({ key: 'ins:p2' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^1 de 2$/ })).toBeDefined()

  await ui.input({ key: 'busca', text: 'PORTUGU', kind: 'submit' })
  expect(preenchidos).toEqual([{ text: 'Responda em português-BR.', mode: 'insert' }])
  // Depois do Enter a pesquisa se esvazia: a lista volta inteira.
  expect(await ui.find({ key: 'ins:p1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2 prompts/ })).toBeDefined()

  // Sem resultado: avisa e não insere nada.
  await ui.input({ key: 'busca', text: 'zzz', kind: 'change' })
  expect(await ui.find({ type: 'Text', text: /Nenhum prompt encontrado/ })).toBeDefined()
  await ui.input({ key: 'busca', text: 'zzz', kind: 'submit' })
  expect(preenchidos.length).toBe(1)
  expect(avisos).toEqual(['Nada para inserir.'])
  await ui.unmount()
})

test('os botões de pasta filtram a lista', async ($, on) => {
  responder(on)
  armazenar(on, { itens: SEMENTE })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'pasta:Git' })
  expect(await ui.find({ key: 'ins:p1' })).toBeDefined()
  expect(await ui.find({ key: 'ins:p2' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^1 de 2$/ })).toBeDefined()

  await ui.press({ key: 'pasta:' })
  expect(await ui.find({ key: 'ins:p2' })).toBeDefined()
  await ui.unmount()
})

test('dados inválidos no armazenamento viram lista vazia', async ($, on) => {
  responder(on)
  armazenar(on, { itens: [{ id: 1 }, 'lixo', null] })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /0 prompts/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Nenhum prompt salvo/ })).toBeDefined()
  await ui.unmount()
})

test('se o armazenamento falhar ao salvar, o painel avisa', async ($, on) => {
  const avisos: string[] = []
  responder(on, [], avisos)
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => {
    throw new Error('disco cheio')
  })
  await iniciar($)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'novo' })
  await ui.input({ key: 'f-texto', text: 'Um prompt.', kind: 'change' })
  await ui.press({ key: 'salvar' })

  expect(avisos).toEqual(['Não foi possível salvar o prompt.'])
  // O formulário continua aberto para a pessoa tentar de novo.
  expect(await ui.find({ type: 'Text', text: /Novo prompt/ })).toBeDefined()
  await ui.unmount()
})

test('o comando /biblioteca abre o painel', async ($, on) => {
  responder(on)
  armazenar(on)
  await iniciar($)

  const resposta = await $.command.run({ command: 'biblioteca', args: '' } as any)
  expect(JSON.stringify(resposta)).toContain('Biblioteca de prompts aberta.')
})
