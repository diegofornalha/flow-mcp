const axios = require('axios');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

// Redirect console.log to stderr to avoid breaking the MCP protocol
const originalConsoleLog = console.log;
console.log = function() {
  console.error.apply(console, arguments);
};

// Ethereum RPC URL
const ETH_RPC_URL = 'https://eth.llamarpc.com';

// Initialize the MCP server
const server = new McpServer({
  name: 'ethereum-rpc',
  version: '1.0.0'
});

// Helper function to make RPC calls
async function makeRpcCall(method, params = []) {
  try {
    const response = await axios.post(ETH_RPC_URL, {
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });

    if (response.data.error) {
      throw new Error(`RPC Error: ${response.data.error.message}`);
    }

    return response.data.result;
  } catch (error) {
    console.error(`Error making RPC call to ${method}:`, error.message);
    throw error;
  }
}

// Tool 1: eth_getCode - Gets the code at a specific address
server.tool(
  'eth_getCode',
  'Retrieves the code at a given Ethereum address',
  {
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('The Ethereum address to get code from'),
    blockParameter: z.string().default('latest').describe('Block parameter (default: "latest")')
  },
  async (args) => {
    try {
      console.error(`Getting code for address: ${args.address} at block: ${args.blockParameter}`);
      
      const code = await makeRpcCall('eth_getCode', [args.address, args.blockParameter]);
      
      return {
        content: [{ 
          type: "text", 
          text: code === '0x' ? 
            `No code found at address ${args.address} (this may be a regular wallet address, not a contract)` : 
            `Contract code at ${args.address}:\n${code}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: Failed to get code. ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool 2: eth_gasPrice - Gets the current gas price
server.tool(
  'eth_gasPrice',
  'Retrieves the current gas price in wei',
  {},
  async () => {
    try {
      console.error('Getting current gas price');
      
      const gasPrice = await makeRpcCall('eth_gasPrice');
      // Convert hex gas price to decimal and then to Gwei for readability
      const gasPriceWei = parseInt(gasPrice, 16);
      const gasPriceGwei = gasPriceWei / 1e9;
      
      return {
        content: [{ 
          type: "text", 
          text: `Current Gas Price:\n${gasPriceWei} Wei\n${gasPriceGwei.toFixed(2)} Gwei` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: Failed to get gas price. ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool 3: eth_getBalance - Gets the balance of an account
server.tool(
  'eth_getBalance',
  'Retrieves the balance of a given Ethereum address',
  {
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('The Ethereum address to check balance'),
    blockParameter: z.string().default('latest').describe('Block parameter (default: "latest")')
  },
  async (args) => {
    try {
      console.error(`Getting balance for address: ${args.address} at block: ${args.blockParameter}`);
      
      const balance = await makeRpcCall('eth_getBalance', [args.address, args.blockParameter]);
      // Convert hex balance to decimal and then to ETH for readability
      const balanceWei = parseInt(balance, 16);
      const balanceEth = balanceWei / 1e18;
      
      return {
        content: [{ 
          type: "text", 
          text: `Balance for ${args.address}:\n${balanceWei} Wei\n${balanceEth.toFixed(6)} ETH` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: Failed to get balance. ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool 4: eth_call - Executes a new message call without creating a transaction
server.tool(
  'eth_call',
  'Executes a call to a contract function without creating a transaction',
  {
    transaction: z.object({
      from: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().describe('The address the transaction is sent from'),
      to: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('The address the transaction is directed to'),
      gas: z.string().regex(/^0x[a-fA-F0-9]+$/).optional().describe('Integer of the gas provided for the transaction execution in hex'),
      gasPrice: z.string().regex(/^0x[a-fA-F0-9]+$/).optional().describe('Integer of the gas price used for each paid gas in hex'),
      value: z.string().regex(/^0x[a-fA-F0-9]+$/).optional().describe('Integer of the value sent with this transaction in hex'),
      data: z.string().regex(/^0x[a-fA-F0-9]*$/).describe('The compiled code of a contract OR the hash of the invoked method signature and encoded parameters')
    }).describe('The transaction call object'),
    blockParameter: z.string().default('latest').describe('Block parameter (default: "latest")')
  },
  async (args) => {
    try {
      console.error(`Executing eth_call with transaction to: ${args.transaction.to} at block: ${args.blockParameter}`);
      
      const result = await makeRpcCall('eth_call', [args.transaction, args.blockParameter]);
      
      return {
        content: [{ 
          type: "text", 
          text: `Call result:\n${result}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: Failed to execute call. ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool 5: eth_getLogs - Retrieves logs matching the given filter criteria
server.tool(
  'eth_getLogs',
  'Retrieves logs matching the given filter criteria',
  {
    filter: z.object({
      fromBlock: z.string().optional().describe('Block number in hex or "latest", "earliest" or "pending"'),
      toBlock: z.string().optional().describe('Block number in hex or "latest", "earliest" or "pending"'),
      address: z.union([
        z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/))
      ]).optional().describe('Contract address or a list of addresses from which logs should originate'),
      topics: z.array(z.union([
        z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        z.array(z.string().regex(/^0x[a-fA-F0-9]{64}$/)),
        z.null()
      ])).optional().describe('Array of 32 Bytes DATA topics')
    }).describe('The filter options')
  },
  async (args) => {
    try {
      console.error(`Getting logs with filter: ${JSON.stringify(args.filter)}`);
      
      const logs = await makeRpcCall('eth_getLogs', [args.filter]);
      
      if (logs.length === 0) {
        return {
          content: [{ type: "text", text: "No logs found matching the filter criteria." }]
        };
      }
      
      // Format logs for better readability
      const formattedLogs = logs.map((log, index) => {
        return `Log #${index + 1}:
  Address: ${log.address}
  Block Number: ${parseInt(log.blockNumber, 16)}
  Transaction Hash: ${log.transactionHash}
  Topics: ${log.topics.join('\n          ')}
  Data: ${log.data}`;
      }).join('\n\n');
      
      return {
        content: [{ 
          type: "text", 
          text: `Found ${logs.length} logs:\n\n${formattedLogs}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: Failed to get logs. ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool 6: eth_sendTransaction - Sends a transaction to the network
server.tool(
  'eth_sendTransaction',
  'Sends a transaction to the Ethereum network',
  {
    transaction: z.object({
      from: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('The address the transaction is sent from'),
      to: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().describe('The address the transaction is directed to'),
      gas: z.string().regex(/^0x[a-fA-F0-9]+$/).optional().describe('Integer of the gas provided for the transaction execution in hex'),
      gasPrice: z.string().regex(/^0x[a-fA-F0-9]+$/).optional().describe('Integer of the gas price used for each paid gas in hex'),
      value: z.string().regex(/^0x[a-fA-F0-9]+$/).optional().describe('Integer of the value sent with this transaction in hex'),
      data: z.string().regex(/^0x[a-fA-F0-9]*$/).optional().describe('The compiled code of a contract OR the hash of the invoked method signature and encoded parameters'),
      nonce: z.string().regex(/^0x[a-fA-F0-9]+$/).optional().describe('Integer of a nonce used to prevent transaction replay')
    }).describe('The transaction object')
  },
  async (args) => {
    try {
      console.error(`Sending transaction from: ${args.transaction.from}`);
      
      // Note: This will likely fail with a public node as it requires an unlocked account
      // Most public nodes don't allow sending transactions directly (would need a wallet/private key)
      const txHash = await makeRpcCall('eth_sendTransaction', [args.transaction]);
      
      return {
        content: [{ 
          type: "text", 
          text: `Transaction sent!\nTransaction Hash: ${txHash}\n\nNote: This request will only work on nodes where the 'from' account is unlocked. Most public nodes don't allow direct transaction sending.`
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: Failed to send transaction. ${error.message}\n\nNote: Most public RPC endpoints don't allow sending raw transactions as it requires an unlocked account. Consider using a wallet or signing the transaction locally before broadcasting.`
        }],
        isError: true
      };
    }
  }
);

// Connect to the stdio transport and start the server
server.connect(new StdioServerTransport())
  .then(() => {
    console.error('Ethereum RPC MCP Server is running...');
  })
  .catch((err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  });
