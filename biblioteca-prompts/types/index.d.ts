// Um prompt salvo. A pasta agrupa os prompts; o texto é uma linha só.
export type Item = { id: string; titulo: string; texto: string; pasta: string }

// O formulário de novo prompt ou de edição. `id` vazio: prompt novo.
export type Rascunho = { id: string; titulo: string; pasta: string; texto: string }

declare module 'claude-code' {
  interface PluginState {
    'biblioteca-prompts': {
      // Os prompts salvos. A cópia durável fica em `$.store`, chave `itens`.
      itens: Shaped<Item[]>
      // Texto da pesquisa. Vazio mostra todos.
      busca: Shaped<string>
      // Pasta escolhida nos botões. Vazio mostra todas as pastas.
      filtroPasta: Shaped<string>
      // O formulário aberto, ou null quando fechado.
      rascunho: Shaped<Rascunho | null>
      // Id do prompt que espera a segunda pressão do botão de apagar. Vazio: nenhum.
      apagando: Shaped<string>
    }
  }
}
