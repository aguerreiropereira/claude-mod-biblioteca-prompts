import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Item, Rascunho } from '../types'

const PAINEL = 'biblioteca-prompts'
// Ícone e uma palavra: a aba do painel mostra pouco texto.
const TITULO = '📚 Prompts'

// Chave de `$.store`, onde a lista fica guardada entre sessões.
const CHAVE_STORE = 'itens'
const PASTA_PADRAO = 'Geral'
const MAX_ITENS = 200
// Tamanho do título que o painel inventa quando a pessoa não escreve um.
const MAX_TITULO_AUTO = 30

// Cores de tema: seguem o tema claro ou escuro da pessoa.
const COR = 'claude'
const COR_BORDA = 'subtle'
const COR_FORM = 'suggestion'

// Largura usada quando o painel não informa as colunas. As colunas que sobram
// para o título são as do painel menos o espaço dos botões e das bordas.
const COLUNAS_PADRAO = 48
const RESERVA_COLUNAS = 14

const itens = atom(
  { plugin: 'biblioteca-prompts', key: 'itens' } as const,
  [],
  { shape: 'itens-1' },
)

const busca = atom(
  { plugin: 'biblioteca-prompts', key: 'busca' } as const,
  '',
  { shape: 'busca-1' },
)

const filtroPasta = atom(
  { plugin: 'biblioteca-prompts', key: 'filtroPasta' } as const,
  '',
  { shape: 'filtroPasta-1' },
)

const rascunho = atom(
  { plugin: 'biblioteca-prompts', key: 'rascunho' } as const,
  null,
  { shape: 'rascunho-1' },
)

const apagando = atom(
  { plugin: 'biblioteca-prompts', key: 'apagando' } as const,
  '',
  { shape: 'apagando-1' },
)

// Corta no fim e põe reticências. Um Button não corta texto longo sozinho.
const cortar = (texto: string, largura: number) =>
  texto.length <= largura
    ? texto
    : `${texto.slice(0, Math.max(1, largura - 1))}…`

const primeiraLinha = (texto: string) => texto.split('\n')[0] ?? ''

const ehItem = (valor: unknown): valor is Item => {
  if (typeof valor !== 'object' || valor === null) return false
  const v = valor as Record<string, unknown>

  return (
    typeof v.id === 'string' &&
    typeof v.titulo === 'string' &&
    typeof v.texto === 'string' &&
    typeof v.pasta === 'string'
  )
}

// Lê o que `$.store` devolveu. Um valor que não é uma lista de itens vira lista vazia.
const lerGuardados = (valor: unknown): Item[] =>
  Array.isArray(valor) ? valor.filter(ehItem).slice(0, MAX_ITENS) : []

// Id do próximo item: `p1`, `p2`... sem repetir um id que já existe.
const proximoId = (lista: Item[]) =>
  `p${1 + Math.max(0, ...lista.map(i => Number(i.id.slice(1)) || 0))}`

const tituloDe = (r: Rascunho) =>
  r.titulo.trim() !== ''
    ? r.titulo.trim()
    : cortar(primeiraLinha(r.texto.trim()), MAX_TITULO_AUTO)

// A pesquisa olha o título, o texto e a pasta. Maiúsculas e minúsculas valem igual.
const casa = (item: Item, consulta: string) =>
  `${item.titulo}\n${item.texto}\n${item.pasta}`.toLowerCase().includes(consulta)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'biblioteca',
      description: 'Abre o painel com os seus prompts salvos',
    })
    try {
      const guardados = lerGuardados(await $.store.get(CHAVE_STORE))
      await update($, itens, () => guardados)
    } catch {
      // Sem leitura do armazenamento: a lista começa vazia.
    }

    return next(e)
  })

  on('command.run', { command: 'biblioteca' }, async $ => {
    await $.ui.open({ id: PAINEL, title: TITULO })

    return { text: 'Biblioteca de prompts aberta.' }
  })

  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    const { Box, Button, Input, Text } = $.ui.resolve(e)

    const todos = await read($, itens)
    const termo = await read($, busca)
    const pastaEscolhida = await read($, filtroPasta)
    const form = await read($, rascunho)
    const confirmando = await read($, apagando)

    const colunas =
      (e.props as unknown as { bodyColumns?: number } | undefined)
        ?.bodyColumns ?? COLUNAS_PADRAO
    const largura = Math.max(10, colunas - RESERVA_COLUNAS)

    const pastas = [...new Set(todos.map(i => i.pasta))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    )
    // Uma pasta que sumiu (apagada ou renomeada) volta para "Todas".
    const pastaAtiva = pastas.includes(pastaEscolhida) ? pastaEscolhida : ''
    const consulta = termo.trim().toLowerCase()
    const filtrados = todos.filter(
      i =>
        (pastaAtiva === '' || i.pasta === pastaAtiva) &&
        (consulta === '' || casa(i, consulta)),
    )

    // Grava a lista no estado e em `$.store`. Quem chama trata a falha.
    const mudarItens = async (fn: (atual: Item[]) => Item[]) => {
      let novo: Item[] = []
      await update($, itens, atual => (novo = fn(atual)))
      await $.store.set(CHAVE_STORE, novo)
    }

    // Insere o texto na caixa de prompt, onde está o cursor. Não envia.
    const inserir = (item: Item) => {
      void update($, apagando, () => '')
      $.prompt
        .fill({ text: item.texto, mode: 'insert' })
        .then(r => {
          if (!r.isFilled) $.ui.toast('A caixa de prompt não aceitou o texto.')
        })
        .catch(() => $.ui.toast('Não foi possível inserir o prompt.'))
    }

    // Enter na pesquisa: insere o primeiro resultado e limpa a pesquisa.
    const inserirPrimeiro = () => {
      const primeiro = filtrados[0]
      if (primeiro === undefined) {
        $.ui.toast('Nada para inserir.')
        return
      }
      inserir(primeiro)
      void update($, busca, () => '')
    }

    const abrirNovo = () => {
      void update($, apagando, () => '')
      void update($, rascunho, () => ({
        id: '',
        titulo: '',
        pasta: pastaAtiva,
        texto: '',
      }))
    }

    const editar = (item: Item) => {
      void update($, apagando, () => '')
      void update($, rascunho, () => ({ ...item }))
    }

    const fecharForm = () => {
      void update($, rascunho, () => null)
    }

    const campo = (nome: 'titulo' | 'pasta' | 'texto', valor: string) => {
      void update($, rascunho, r => (r === null ? r : { ...r, [nome]: valor }))
    }

    const salvar = (r: Rascunho) => {
      const texto = r.texto.trim()
      if (texto === '') {
        $.ui.toast('Escreva o texto do prompt.')
        return
      }
      if (r.id === '' && todos.length >= MAX_ITENS) {
        $.ui.toast(`A biblioteca está cheia: ${MAX_ITENS} prompts.`)
        return
      }
      const titulo = tituloDe(r)
      const pasta = r.pasta.trim() === '' ? PASTA_PADRAO : r.pasta.trim()
      mudarItens(atual =>
        r.id === ''
          ? [{ id: proximoId(atual), titulo, texto, pasta }, ...atual]
          : atual.map(i => (i.id === r.id ? { ...i, titulo, texto, pasta } : i)),
      )
        .then(() => update($, rascunho, () => null))
        .then(() => {
          $.ui.toast(r.id === '' ? 'Prompt salvo.' : 'Prompt atualizado.')
        })
        .catch(() => $.ui.toast('Não foi possível salvar o prompt.'))
    }

    // Apagar pede duas pressões: a primeira arma o botão, a segunda apaga.
    const apagar = (item: Item) => {
      if (confirmando !== item.id) {
        void update($, apagando, () => item.id)
        return
      }
      mudarItens(atual => atual.filter(i => i.id !== item.id))
        .then(() => update($, apagando, () => ''))
        .catch(() => $.ui.toast('Não foi possível apagar o prompt.'))
    }

    const limparBusca = () => {
      void update($, busca, () => '')
    }

    const filtrando = consulta !== '' || pastaAtiva !== ''
    const resumo = filtrando
      ? `${filtrados.length} de ${todos.length}`
      : `${todos.length} ${todos.length === 1 ? 'prompt' : 'prompts'}`

    return (
      <Box flexDirection="column">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={COR_BORDA}
          paddingX={1}
        >
          <Box justifyContent="space-between">
            <Text bold color={COR}>
              ✎ Biblioteca
            </Text>
            <Text dimColor>{resumo}</Text>
          </Box>

          <Box>
            <Box flexGrow={1} flexShrink={1}>
              <Input
                key="busca"
                placeholder="Buscar prompts…"
                value={termo}
                onInput={texto => {
                  void update($, busca, () => texto)
                }}
                onSubmit={inserirPrimeiro}
                submitLabel="inserir"
              />
            </Box>
            {termo !== '' && (
              <Button key="limpar-busca" plain onPress={limparBusca}>
                <Text color="error"> ✕</Text>
              </Button>
            )}
            {form === null && (
              <Button key="novo" plain onPress={abrirNovo}>
                <Text bold color={COR_FORM}> + Novo</Text>
              </Button>
            )}
          </Box>

          {pastas.length > 1 && (
            <Box flexWrap="wrap">
              {['', ...pastas].map(p => {
                const ativa = p === pastaAtiva

                return (
                  <Button
                    key={`pasta:${p}`}
                    plain
                    onPress={() => {
                      void update($, filtroPasta, () => p)
                    }}
                  >
                    <Text bold={ativa} color={ativa ? COR : undefined} dimColor={!ativa}>
                      {`${ativa ? '●' : '○'} ${p === '' ? 'Todas' : p}  `}
                    </Text>
                  </Button>
                )
              })}
            </Box>
          )}

          {form !== null && (
            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor={COR_FORM}
              borderDimColor
              paddingX={1}
            >
              <Text bold color={COR_FORM}>
                {form.id === '' ? 'Novo prompt' : 'Editar prompt'}
              </Text>
              <Input
                key="f-titulo"
                label="Título "
                placeholder="opcional"
                value={form.titulo}
                onInput={t => campo('titulo', t)}
                onSubmit={t => salvar({ ...form, titulo: t })}
                submitLabel="salvar"
              />
              <Input
                key="f-pasta"
                label="Pasta  "
                placeholder={PASTA_PADRAO}
                value={form.pasta}
                onInput={t => campo('pasta', t)}
                onSubmit={t => salvar({ ...form, pasta: t })}
                submitLabel="salvar"
              />
              <Input
                key="f-texto"
                label="Texto  "
                placeholder="o que será inserido"
                rows={3}
                value={form.texto}
                onInput={t => campo('texto', t)}
                onSubmit={t => salvar({ ...form, texto: t })}
                submitLabel="salvar"
              />
              <Box>
                <Button key="salvar" plain onPress={() => salvar(form)}>
                  <Text bold color="success">✔ Salvar</Text>
                </Button>
                <Button key="cancelar" plain onPress={fecharForm}>
                  <Text dimColor>{'  ✕ Cancelar'}</Text>
                </Button>
              </Box>
            </Box>
          )}

          {todos.length === 0 && form === null && (
            <Text dimColor italic>
              Nenhum prompt salvo. Clique em + Novo.
            </Text>
          )}
          {todos.length > 0 && filtrados.length === 0 && (
            <Text dimColor italic>
              Nenhum prompt encontrado.
            </Text>
          )}

          {filtrados.map(item => (
            <Box key={`item:${item.id}`} flexDirection="column">
              <Box justifyContent="space-between">
                <Button key={`ins:${item.id}`} plain onPress={() => inserir(item)}>
                  <Text bold color={COR}>{`▸ ${cortar(item.titulo, largura)}`}</Text>
                </Button>
                <Box flexShrink={0}>
                  <Button key={`edt:${item.id}`} plain onPress={() => editar(item)}>
                    <Text color={COR_FORM}> ✎</Text>
                  </Button>
                  <Button key={`del:${item.id}`} plain onPress={() => apagar(item)}>
                    <Text color="error">
                      {confirmando === item.id ? ' apagar?' : ' ✕'}
                    </Text>
                  </Button>
                </Box>
              </Box>
              <Box>
                <Text dimColor wrap="truncate-end">
                  {`  ${item.pasta} · ${primeiraLinha(item.texto)}`}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    )
  })
}
