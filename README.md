# Servidor MCP para Flow EVM
[![smithery badge](https://smithery.ai/badge/@diegofornalha/flow-mcp)](https://smithery.ai/server/@diegofornalha/flow-mcp)

Um servidor Model Context Protocol (MCP) para interagir com a blockchain Flow EVM. Este servidor serve como uma ponte entre modelos de linguagem e a rede Flow EVM, permitindo consultas e interações com a blockchain de forma simplificada.

## O que é Flow EVM?

Flow EVM é uma implementação da Máquina Virtual Ethereum (EVM) na blockchain Flow, permitindo compatibilidade com contratos inteligentes, ferramentas e bibliotecas do ecossistema Ethereum, enquanto aproveita a arquitetura escalonável e eficiente da Flow.

## Recursos

- `flow_getNetworkInfo`: Retorna informações sobre a rede Flow EVM atual
- `flow_getCode`: Obtém o código em um endereço específico da Flow EVM
- `flow_chainId`: Retorna o ID da cadeia atual da rede Flow EVM
- `flow_gasPrice`: Obtém o preço atual do gás na rede
- `flow_getBalance`: Consulta o saldo de uma conta na Flow EVM
- `flow_call`: Executa uma chamada de função sem criar uma transação
- `flow_getLogs`: Obtém logs com base em critérios de filtro específicos
- `flow_sendRawTransaction`: Envia uma transação assinada para a rede
- `flow_blockNumber`: Retorna o número do bloco mais recente
- `flow_checkCOA`: Verifica se um endereço é uma Conta Controlada por Cadence (COA)

## Implementação

Este servidor MCP implementa uma camada de abstração sobre os métodos RPC padrão do Ethereum, adaptados para o ambiente Flow EVM. Internamente, o servidor faz chamadas para os métodos RPC Ethereum (`eth_*`), mas expõe uma interface com nomenclatura Flow (`flow_*`) para maior clareza e identificação com o ecossistema Flow.

A Flow EVM suporta a maioria dos métodos RPC do Ethereum, permitindo a interação com a rede Flow usando as mesmas ferramentas e padrões familiares do ecossistema Ethereum.

## Redes Suportadas

- Flow EVM Mainnet (Chain ID: 747)
- Flow EVM Testnet (Chain ID: 545)

## Uso

1. Instale as dependências: `npm install`
2. Compile o projeto: `npx tsc`
3. Execute o servidor: `npm start`

## Exemplo de uso com Claude

```
Consulte o saldo de 0x76A56657d20f572872A81b75530c905fD9F845e5 na Flow EVM.
```

Claude poderá usar a ferramenta `flow_getBalance` para obter esta informação.
