import axios from 'axios';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Definição de tipos para os objetos
type RpcResponse = {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
};

type TransactionObject = {
  from?: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  nonce?: string;
};

type LogObject = {
  address: string;
  blockNumber: string;
  transactionHash: string;
  topics: string[];
  data: string;
};

type FilterOptions = {
  fromBlock?: string;
  toBlock?: string;
  address?: string | string[];
  topics?: (string | string[] | null)[];
};

// Flow EVM Configuration
type NetworkConfig = {
  name: string;
  rpcUrl: string;
  chainId: number;
  blockExplorer: string;
  currency: string;
};

// Flow EVM Network Configurations
const FLOW_NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'Flow EVM Mainnet',
    rpcUrl: 'https://mainnet.evm.nodes.onflow.org',
    chainId: 747,
    blockExplorer: 'https://evm.flowscan.io',
    currency: 'FLOW'
  },
  testnet: {
    name: 'Flow EVM Testnet',
    rpcUrl: 'https://testnet.evm.nodes.onflow.org',
    chainId: 545,
    blockExplorer: 'https://evm-testnet.flowscan.io',
    currency: 'FLOW'
  }
};

// Select the network (can be changed to mainnet when ready)
const SELECTED_NETWORK = 'testnet';
const NETWORK_CONFIG = FLOW_NETWORKS[SELECTED_NETWORK];

// Redirect console.log to stderr to avoid breaking the MCP protocol
const originalConsoleLog = console.log;
console.log = function(...args: any[]): void {
  console.error.apply(console, args);
};

// Initialize the MCP server
const server = new McpServer({
  name: 'flow-evm-rpc',
  version: '1.0.0'
});

// Helper function to make RPC calls
async function makeRpcCall(method: string, params: any[] = []): Promise<any> {
  try {
    const response = await axios.post<RpcResponse>(NETWORK_CONFIG.rpcUrl, {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error making RPC call to ${method}:`, errorMessage);
    throw error;
  }
}

// Tool 0: Get Network Information
server.tool(
  'flow_getNetworkInfo',
  'Retrieves information about the current Flow EVM network configuration',
  {},
  async () => {
    try {
      console.error('Getting Flow EVM network information');
      
      return {
        content: [{ 
          type: "text", 
          text: `Flow EVM Network Information:
Network Name: ${NETWORK_CONFIG.name}
RPC Endpoint: ${NETWORK_CONFIG.rpcUrl}
Chain ID: ${NETWORK_CONFIG.chainId}
Block Explorer: ${NETWORK_CONFIG.blockExplorer}
Currency: ${NETWORK_CONFIG.currency}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to get network information. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 1: flow_getCode - Gets the code at a specific address
server.tool(
  'flow_getCode',
  'Retrieves the code at a given Flow EVM address',
  {
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('The Flow EVM address to get code from'),
    blockParameter: z.string().default('latest').describe('Block parameter (default: "latest")')
  },
  async (args: { address: string; blockParameter: string }) => {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to get code. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 2: flow_chainId - Gets the current chain ID
server.tool(
  'flow_chainId',
  'Retrieves the current chain ID of the Flow EVM network',
  {},
  async () => {
    try {
      console.error('Getting chain ID');
      
      const chainId = await makeRpcCall('eth_chainId');
      const chainIdDecimal = parseInt(chainId, 16);
      
      return {
        content: [{ 
          type: "text", 
          text: `Current Chain ID:\nHex: ${chainId}\nDecimal: ${chainIdDecimal}` 
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to get chain ID. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 3: flow_gasPrice - Gets the current gas price
server.tool(
  'flow_gasPrice',
  'Retrieves the current gas price in Flow EVM',
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
          text: `Current Gas Price:\n${gasPriceWei} Atto-FLOW\n${gasPriceGwei.toFixed(2)} Gwei` 
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to get gas price. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 4: flow_getBalance - Gets the balance of an account
server.tool(
  'flow_getBalance',
  'Retrieves the balance of a given Flow EVM address',
  {
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('The Flow EVM address to check balance'),
    blockParameter: z.string().default('latest').describe('Block parameter (default: "latest")')
  },
  async (args: { address: string; blockParameter: string }) => {
    try {
      console.error(`Getting balance for address: ${args.address} at block: ${args.blockParameter}`);
      
      const balance = await makeRpcCall('eth_getBalance', [args.address, args.blockParameter]);
      // Convert hex balance to decimal and then to FLOW for readability
      const balanceAttoFlow = parseInt(balance, 16);
      const balanceFlow = balanceAttoFlow / 1e18;
      
      return {
        content: [{ 
          type: "text", 
          text: `Balance for ${args.address}:\n${balanceAttoFlow} Atto-FLOW\n${balanceFlow.toFixed(6)} FLOW` 
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to get balance. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 5: flow_call - Executes a new message call without creating a transaction
server.tool(
  'flow_call',
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
  async (args: { transaction: TransactionObject; blockParameter: string }) => {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to execute call. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 6: flow_getLogs - Retrieves logs matching the given filter criteria
server.tool(
  'flow_getLogs',
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
  async (args: { filter: FilterOptions }) => {
    try {
      console.error(`Getting logs with filter: ${JSON.stringify(args.filter)}`);
      
      const logs = await makeRpcCall('eth_getLogs', [args.filter]) as LogObject[];
      
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to get logs. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 7: flow_sendRawTransaction - Sends a signed transaction to the network
server.tool(
  'flow_sendRawTransaction',
  'Submits a signed transaction to the Flow EVM network',
  {
    signedTransactionData: z.string().regex(/^0x[a-fA-F0-9]+$/).describe('The signed transaction data')
  },
  async (args: { signedTransactionData: string }) => {
    try {
      console.error(`Sending raw transaction: ${args.signedTransactionData.substring(0, 20)}...`);
      
      const txHash = await makeRpcCall('eth_sendRawTransaction', [args.signedTransactionData]);
      
      return {
        content: [{ 
          type: "text", 
          text: `Transaction sent successfully!\nTransaction Hash: ${txHash}\nView on Block Explorer: ${NETWORK_CONFIG.blockExplorer}/tx/${txHash}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ 
          type: "text", 
          text: `Error: Failed to send transaction. ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Tool 8: flow_blockNumber - Gets the latest block number
server.tool(
  'flow_blockNumber',
  'Gets the latest block number on the Flow EVM network',
  {},
  async () => {
    try {
      console.error('Getting latest block number');
      
      const blockNumber = await makeRpcCall('eth_blockNumber');
      const blockNumberDecimal = parseInt(blockNumber, 16);
      
      return {
        content: [{ 
          type: "text", 
          text: `Latest Block Number:\nHex: ${blockNumber}\nDecimal: ${blockNumberDecimal}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to get block number. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 9: Check for COA (Cadence-Owned Account)
server.tool(
  'flow_checkCOA',
  'Checks if an address is a Cadence-Owned Account (COA)',
  {
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('The Flow EVM address to check')
  },
  async (args: { address: string }) => {
    try {
      console.error(`Checking if address is a COA: ${args.address}`);
      
      // COA addresses start with the prefix 0x000000000000000000000002
      const isCOA = args.address.toLowerCase().startsWith('0x000000000000000000000002');
      const isFactoryAddress = args.address.toLowerCase() === '0x0000000000000000000000020000000000000000';
      
      let message = '';
      if (isFactoryAddress) {
        message = `The address ${args.address} is the COA factory address, which is reserved for deploying contracts for COA accounts.`;
      } else if (isCOA) {
        message = `The address ${args.address} is a Cadence-Owned Account (COA), which is controlled by a resource in the Cadence environment, not by a private key.`;
      } else {
        message = `The address ${args.address} is not a Cadence-Owned Account (COA). It appears to be a regular Externally Owned Account (EOA) or contract address.`;
      }
      
      return {
        content: [{ 
          type: "text", 
          text: message
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error: Failed to check COA status. ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Connect to the stdio transport and start the server
server.connect(new StdioServerTransport())
  .then(() => {
    console.error(`Flow EVM MCP Server (${NETWORK_CONFIG.name}) is running...`);
  })
  .catch((err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  }); 