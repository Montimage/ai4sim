// types pour les attaques
export interface Attack {
  id: string;
  name: string;
  description: string;
  command: (paramValues: Record<string, string>) => string;
  parameters?: Record<string, {
    label: string;
    type: string;
    default?: string;
    required?: boolean;
    description?: string;
  }>;
}

// Interface pour les outils
export interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  attacks: Attack[];
  command: (paramValues: Record<string, string>) => string;
  parameters: Record<string, any>;
  iframe?: {
    port: number;
    successMessage?: string;
  };
  multiOutput?: {
    enabled: boolean;
    outputs: Array<{
      id: string;
      name: string;
      description: string;
      command: string;
      workingDirectory?: string;
      successMessage?: string;
      iframe?: {
        port: number;
        path?: string;
      };
    }>;
  };
  multiTerminal?: {
    preCommands?: Array<{
      name: string;
      command: string;
      description: string;
    }>;
    initCommands?: Array<{
      name: string;
      command: string;
      description: string;
    }>;
  };
  sequentialExecution?: {
    enabled: boolean;
    steps: Array<{
      id: string;
      name: string;
      description: string;
      command: string;
      workingDirectory?: string;
      successMessage?: string;
      dependsOn?: string;
      iframe?: {
        port: number;
        path?: string;
      };
    }>;
    finalIframe?: {
      port: number;
      successMessage?: string;
    };
  };
}

export const TOOLS: Tool[] = [
  {
    id: "gan-fuzzer",
    name: "GAN-Based Fuzzer",
    description: "Replays PCAP files using GAN-based fuzzing.",
    type: "FUZZING",
    status: "implemented",
    attacks: [
      {
        id: "gan-fuzzer-default",
        name: "Standard GAN Fuzzing",
        description: "Basic GAN fuzzing with standard parameters",
        command: (paramValues: Record<string, string>) => {
          const pcapFile = paramValues["pcap-file"] || "pcap/sa.pcap";
          const targetHost = paramValues["target-host"] || "10.0.0.2";
          const targetPort = paramValues["target-port"] || "38412";
          const nbCopies = paramValues["nb-copies"] || "2000";
          
          return `docker run --rm ghcr.io/montimage/5greplay:latest replay -t "${pcapFile}" -X forward.target-ports=${targetPort} -X forward.target-hosts=${targetHost} -X forward.nb-copies=${nbCopies} -X forward.default=FORWARD`;
        },
        parameters: {
          "pcap-file": {
            label: "PCAP File Path",
            type: "string",
            default: "pcap/sa.pcap"
          },
          "target-host": {
            label: "Target IP",
            type: "string",
            default: "10.0.0.2"
          },
          "target-port": {
            label: "Target Port",
            type: "number",
            default: "38412"
          },
          "nb-copies": {
            label: "Packet Copies",
            type: "number",
            default: "2000"
          }
        }
      }
    ],
    // Pour maintenir la rétrocompatibilité, on garde la commande au niveau de l'outil
    // qui pointe vers la première attaque
    command: function(paramValues: Record<string, string>) {
      return this.attacks[0].command(paramValues);
    },
    parameters: {}
  },
  {
    id: "knx-smart-fuzzer",
    name: "KNX Smart Fuzzer",
    description: "MMT-Pentester component implementing various cyber-attacks against KNX infrastructure",
    type: "FUZZING",
    status: "implemented",
    attacks: [
      {
        id: "knx-bof-fuzzing",
        name: "BOF Fuzzing",
        description: "Fuzzing attack using malformed PropRead.req messages to test KNX device robustness",
        command: (paramValues: Record<string, string>) => {
          const knxServer = paramValues["knx-server"] || "192.168.1.1";
          const knxPort = paramValues["knx-port"] || "3671";
          const dockerImage = "knxsmartfuzzer:latest";
          
          return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id 1 --knxserver ${knxServer} --knxport ${knxPort}`;
        },
        parameters: {
          "knx-server": {
            label: "KNX/IP Server",
            type: "target",
            default: "192.168.1.1",
            required: true,
            description: "IP address of the target KNX/IP interface"
          },
          "knx-port": {
            label: "KNX Port",
            type: "number",
            default: "3671",
            description: "UDP port of the KNX/IP interface (default: 3671)"
          }
        }
      },
      {
        id: "knx-unauthorized-access",
        name: "Unauthorized Access",
        description: "Exploits lack of authentication to send unauthorized GroupValueWrite commands",
        command: (paramValues: Record<string, string>) => {
          const knxServer = paramValues["knx-server"] || "192.168.1.1";
          const knxPort = paramValues["knx-port"] || "3671";
          const dockerImage = "knxsmartfuzzer:latest";
          
          return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id 2 --knxserver ${knxServer} --knxport ${knxPort}`;
        },
        parameters: {
          "knx-server": {
            label: "KNX/IP Server",
            type: "target",
            default: "192.168.1.1",
            required: true,
            description: "IP address of the target KNX/IP interface"
          },
          "knx-port": {
            label: "KNX Port",
            type: "number",
            default: "3671",
            description: "UDP port of the KNX/IP interface (default: 3671)"
          }
        }
      },
      {
        id: "knx-network-scanning",
        name: "KNX Network Scanning",
        description: "Discovers KNX/IP routers and interfaces via multicast messages to map infrastructure",
        command: (paramValues: Record<string, string>) => {
          const knxServer = paramValues["knx-server"] || "224.0.23.12";
          const knxPort = paramValues["knx-port"] || "3671";
          const dockerImage = "knxsmartfuzzer:latest";
          
          return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id 3 --knxserver ${knxServer} --knxport ${knxPort}`;
        },
        parameters: {
          "knx-server": {
            label: "KNX/IP Server",
            type: "target",
            default: "224.0.23.12",
            required: true,
            description: "IP address for KNX network discovery (multicast: 224.0.23.12)"
          },
          "knx-port": {
            label: "KNX Port",
            type: "number",
            default: "3671",
            description: "UDP port of the KNX/IP interface (default: 3671)"
          }
        }
      },
      {
        id: "knx-bus-scanning",
        name: "KNX Bus Scanning",
        description: "Scans line by line to discover all KNX devices connected to the bus. Requires a real KNX infrastructure to function properly.",
        command: (paramValues: Record<string, string>) => {
          const knxServer = paramValues["knx-server"] || "192.168.1.1";
          const dockerImage = "knxsmartfuzzer:latest";
          
          return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id 4 --knxserver ${knxServer} --knxport 3671`;
        },
        parameters: {
          "knx-server": {
            label: "KNX/IP Server",
            type: "target",
            default: "192.168.1.1",
            required: true,
            description: "IP address of the target KNX/IP interface (must be accessible)"
          }
        }
      },
      {
        id: "knx-flooding-valid",
        name: "Flooding DoS (Valid Packets)",
        description: "Denial of service attack by flooding with valid KNX messages (heartbeats)",
        command: (paramValues: Record<string, string>) => {
          const knxServer = paramValues["knx-server"] || "192.168.1.1";
          const knxPort = paramValues["knx-port"] || "3671";
          const dockerImage = "knxsmartfuzzer:latest";
          
          return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id 5 --knxserver ${knxServer} --knxport ${knxPort}`;
        },
        parameters: {
          "knx-server": {
            label: "KNX/IP Server",
            type: "target",
            default: "192.168.1.1",
            required: true,
            description: "IP address of the target KNX/IP interface"
          },
          "knx-port": {
            label: "KNX Port",
            type: "number",
            default: "3671",
            description: "UDP port of the KNX/IP interface (default: 3671)"
          }
        }
      },
      {
        id: "knx-flooding-invalid",
        name: "Flooding DoS (Invalid Packets)",
        description: "Denial of service attack by flooding with partially invalid KNX messages",
        command: (paramValues: Record<string, string>) => {
          const knxServer = paramValues["knx-server"] || "192.168.1.1";
          const knxPort = paramValues["knx-port"] || "3671";
          const dockerImage = "knxsmartfuzzer:latest";
          
          return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id 6 --knxserver ${knxServer} --knxport ${knxPort}`;
        },
        parameters: {
          "knx-server": {
            label: "KNX/IP Server",
            type: "target",
            default: "192.168.1.1",
            required: true,
            description: "IP address of the target KNX/IP interface"
          },
          "knx-port": {
            label: "KNX Port",
            type: "number",
            default: "3671",
            description: "UDP port of the KNX/IP interface (default: 3671)"
          }
        }
      }
    ],
    // Pour maintenir la rétrocompatibilité
    command: function(paramValues: Record<string, string>) {
      return this.attacks[0].command(paramValues);
    },
    parameters: {}
  },
  {
    id: "maip",
    name: "MAIP",
    description: "Advanced simulation of AI-based adversarial attacks",
    type: "SIMULATION",
    status: "implemented",
    attacks: [
      {
        id: "maip-standard",
        name: "Standard MAIP",
        description: "Default MAIP configuration",
        command: (_paramValues: Record<string, string>) => "tools/maip/start_maip_iframe.sh",
        parameters: {}
      }
    ],
    command: function(paramValues: Record<string, string>) {
      return this.attacks[0].command(paramValues);
    },
    parameters: {},
    iframe: {
      port: 31057,
      successMessage: "MAIP Server started successfully on port 31057"
    },
    // Configuration pour la séquence intelligente MAIP
    sequentialExecution: {
      enabled: true,
      steps: [
        {
          id: "server",
          name: "MAIP Server",
          description: "Server backend with AI services",
          command: "tools/maip/start_maip_iframe.sh",
          workingDirectory: "tools/maip",
          successMessage: "MAIP Server started on http://0.0.0.0:31057",
          iframe: {
            port: 31057,
            path: "/"
          }
        },
        {
          id: "client",
          name: "MAIP Client",
          description: "React frontend interface",
          command: "bash tools/maip/start-client.sh",
          workingDirectory: "tools/maip",
          successMessage: "Compiled successfully!",
          dependsOn: "server",
          iframe: {
            port: 3001,
            path: "/"
          }
        }
      ],
      finalIframe: {
        port: 31057,
        successMessage: "MAIP Server started successfully on port 31057"
      }
    },
    // Configuration pour les outputs multiples (legacy)
    multiOutput: {
      enabled: true,
      outputs: [
        {
          id: "server",
          name: "MAIP Server",
          description: "Server backend with AI services",
          command: "tools/maip/start_maip_iframe.sh",
          workingDirectory: "tools/maip",
          successMessage: "MAIP Server started on http://0.0.0.0:31057",
          iframe: {
            port: 31057,
            path: "/"
          }
        },
        {
          id: "client",
          name: "MAIP Client",
          description: "React frontend interface",
          command: "./start-client.sh",
          workingDirectory: "tools/maip",
          successMessage: "Compiled successfully!",
          iframe: {
            port: 3001,
            path: "/"
          }
        }
      ]
    }
  },
  {
    id: "shennina",
    name: "Shennina",
    description: "AI-powered penetration testing framework with automated exploit selection",
    type: "FRAMEWORK",
    status: "implemented",
    attacks: [
      {
        id: "shennina-full-assessment",
        name: "Full AI Assessment",
        description: "Complete penetration testing with AI-powered exploit selection",
        command: (paramValues: Record<string, string>) => {
          const target = paramValues["target"] || "172.17.0.2";
          const lhost = paramValues["lhost"] || "172.17.0.1";
          
          return `bash -c 'cd tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} --mode exploitation'`;
        },
        parameters: {
          "target": {
            label: "Target IP",
            type: "target",
            default: "172.17.0.2",
            required: true,
            description: "Target IP address for exploitation"
          },
          "lhost": {
            label: "Local Host IP",
            type: "string", 
            default: "172.17.0.1",
            required: true,
            description: "Local host IP for reverse connections"
          },
        }
      },
      {
        id: "shennina-training",
        name: "AI Training Mode",
        description: "Train Shennina AI on target environment",
        command: (paramValues: Record<string, string>) => {
          const target = paramValues["target"] || "172.17.0.2";
          const lhost = paramValues["lhost"] || "172.17.0.1";
          
          return `bash -c 'cd tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} --mode training'`;
        },
        parameters: {
          "target": {
            label: "Training Target IP",
            type: "target",
            default: "172.17.0.2",
            required: true,
            description: "Target IP for AI training"
          },
          "lhost": {
            label: "Local Host IP",
            type: "string",
            default: "172.17.0.1", 
            required: true,
            description: "Local host IP for connections"
          }
        }
      },
      {
        id: "shennina-scan-only",
        name: "Service Scan Only",
        description: "Perform only service scanning phase",
        command: (paramValues: Record<string, string>) => {
          const target = paramValues["target"] || "target.local";
          const lhost = paramValues["lhost"] || "172.17.0.1";
          
          return `bash -c 'cd tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} --mode exploitation'`;
        },
        parameters: {
          "target": {
            label: "Target Host",
            type: "target",
            default: "172.17.0.2",
            required: true,
            description: "Target hostname or IP for scanning"
          },
          "lhost": {
            label: "Local Host IP",
            type: "string",
            default: "172.17.0.1",
            required: true,
            description: "Local host IP for scanning"
          }
        }
      }
    ],
    command: function(paramValues: Record<string, string>) {
      return this.attacks[0].command(paramValues);
    },
    parameters: {},
    multiTerminal: {
      preCommands: [
        {
          name: "Exfiltration Server",
          command: "bash -c 'cd tools/shennina/exfiltration-server && ./run-server.sh'",
          description: "Starts the exfiltration server for data collection"
        },
        {
          name: "MSF RPC Server", 
          command: "bash -c 'cd tools/shennina && python3 scripts/run-msfrpc.py'",
          description: "Starts Metasploit RPC server for exploit execution"
        }
      ],
      initCommands: [
        {
          name: "Initialize Exploits Tree",
          command: "bash -c 'cd tools/shennina && python3 shennina_standalone.py --initialize-exploits-tree'",
          description: "Initialize the exploits database"
        }
      ]
    }
  },
  {
    id: "caldera",
    name: "Caldera",
    description: "Complete framework for configuring and executing advanced attacks",
    type: "FRAMEWORK",
    status: "implemented",
    attacks: [
      {
        id: "caldera-standard",
        name: "Standard Caldera",
        description: "Default Caldera configuration",
        command: (_paramValues: Record<string, string>) => "tools/caldera/start_caldera.sh",
        parameters: {}
      }
    ],
    command: function(paramValues: Record<string, string>) {
      return this.attacks[0].command(paramValues);
    },
    parameters: {},
    iframe: {
      port: 8888,
      successMessage: "All systems ready"
    }
  }
];

/**
 * Obtient la liste des outils disponibles
 * @returns Array des outils disponibles
 */
export function getFilteredTools(): Tool[] {
  return TOOLS;
}
