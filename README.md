# Servidor MCP para Flow EVM

Um servidor Model Context Protocol (MCP) para interagir com a blockchain Flow EVM.

## Recursos

- flow_getNetworkInfo: Informações sobre a rede Flow EVM
- eth_getCode: Código em um endereço Flow EVM
- eth_chainId: ID da cadeia atual
- eth_gasPrice: Preço atual do gás
- eth_getBalance: Saldo de uma conta
- eth_call: Chamada de função sem criar transação
- eth_getLogs: Logs com base em critérios de filtro
- eth_sendRawTransaction: Envio de transação assinada
- eth_blockNumber: Número do bloco mais recente
- flow_checkCOA: Verificação de Conta Controlada por Cadence

## Uso

1. Instale as dependências: `npm install`
2. Compile o projeto: `npx tsc`
3. Execute o servidor: `npm start`
