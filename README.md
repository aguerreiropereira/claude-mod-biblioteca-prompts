# Mod biblioteca-prompts

Painel lateral para o Claude Code. O painel guarda os seus prompts e insere o texto na caixa de prompt com um clique.

## Como usar

1. Digite `/biblioteca`. O painel abre em uma aba chamada `📚 Prompts`. Ele não abre sozinho.
2. Clique em **+ Novo**. Preencha `Título`, `Pasta` e `Texto`. Clique em **✔ Salvar**.
   - O título é opcional. Sem título, o painel usa o começo do texto.
   - A pasta é opcional. Sem pasta, o painel usa `Geral`.
   - O texto aceita várias linhas.
3. Clique em um prompt da lista. O texto entra na caixa de prompt, onde está o cursor. O mod não envia o texto. Você ainda pode editar antes de enviar.

Outras ações:

- **Buscar prompts**: o campo filtra pelo título, pelo texto e pela pasta. Maiúsculas e minúsculas valem igual. Clique em `✕` ao lado do campo para limpar.
- **Enter na busca**: insere o primeiro resultado na caixa de prompt e limpa a busca.
- **Botões de pasta**: aparecem quando há duas pastas ou mais. Eles mostram só os prompts da pasta escolhida. `Todas` mostra tudo.
- **✎**: edita o prompt.
- **✕**: apaga o prompt. O botão pede uma segunda pressão e mostra `apagar?` antes de apagar.

Os prompts ficam guardados entre sessões, no armazenamento do próprio mod. A biblioteca aceita até 200 prompts.

O mod só lê e grava dados locais. Ele não faz chamadas de rede e não envia dados para fora da máquina.

## Requisitos

- Claude Code instalado, com o comando `claude` disponível no terminal.
- Windows com PowerShell. Em outros sistemas, use a instalação manual.

## Instalar

### Pelo GitHub

Este repositório é privado. Só instala quem você convidou no GitHub e cuja máquina tem uma credencial do GitHub. Se a máquina ainda não tem, rode estes dois comandos uma vez:

```
gh auth login
gh auth setup-git
```

Em uma sessão do Claude Code no terminal, digite:

```
/plugin install biblioteca-prompts --marketplace aguerreiropereira/claude-mod-biblioteca-prompts
```

Em um shell, rode:

```
claude plugin install biblioteca-prompts --marketplace aguerreiropereira/claude-mod-biblioteca-prompts --scope user
```

O Claude Code pergunta `Add marketplace?`. Responda `y`. A mensagem `Installed biblioteca-prompts` confirma a instalação. Nesse caso, o Claude Code guarda a própria cópia do mod. Você pode apagar a pasta baixada depois da instalação.

### Windows, pela pasta

1. Copie esta pasta inteira para a máquina nova.
2. Dê um duplo clique em `instalar.cmd`.
3. Abra uma nova sessão do Claude Code.

### Instalação manual

Rode este comando em um terminal. Troque `<pasta>` pelo caminho desta pasta.

```
claude plugin install biblioteca-prompts --marketplace "<pasta>" --scope user
```

## Conferir

1. Rode `claude plugin list`. A lista deve mostrar `biblioteca-prompts`.
2. Abra uma nova sessão do Claude Code.
3. Digite `/biblioteca`.

## Atualizar

### Instalou pelo GitHub

1. Rode este comando em um shell:
   ```
   claude plugin update biblioteca-prompts --scope user
   ```
2. A mensagem `updated from 0.1.1 to 0.1.2` confirma a atualização. Os números mudam com a versão.
3. Reinicie o Claude Code. A versão nova só vale em uma sessão nova.

### Instalou pela pasta

1. Troque os arquivos desta pasta pela versão nova. Mantenha a pasta no mesmo lugar.
2. Em uma sessão aberta do Claude Code, digite `/reload-plugins`. Ou abra uma nova sessão.

### Quem mantém o repositório

O Claude Code guarda cada versão do mod em uma pasta própria, com o número de `version` no nome. Mude esse número a cada versão nova.

1. Mude o número de `version` em `biblioteca-prompts/.claude-plugin/plugin.json`.
2. Faça o commit.
3. Rode `git push`.

## Remover

- Windows: rode `instalar.cmd remover`.
- Manual: rode `claude plugin uninstall biblioteca-prompts`.

## Avisos

- **Não mova nem apague esta pasta depois da instalação pela pasta.** O Claude Code lê o mod direto dela.
- O título da aba é `📚 Prompts`. O título fica guardado quando o painel abre. Se você mudar o título no código, feche a aba e digite `/biblioteca` de novo.
- A pasta `biblioteca-prompts/` guarda o mod. O arquivo `.claude-plugin/marketplace.json` desta pasta lista o mod para o Claude Code.
- Este mod usa o nome de marketplace `mods-biblioteca`. Ele não conflita com o marketplace do mod `atividade-sessao`.

## Testes

O mod traz testes em `biblioteca-prompts/hooks/biblioteca.test.ts`. Para rodar:

```
claude plugin test "<pasta>\biblioteca-prompts"
```
