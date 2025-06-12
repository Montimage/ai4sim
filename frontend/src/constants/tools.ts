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

export const TOOLS = [
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
      },
      {
        id: "gan-fuzzer-enhanced",
        name: "Enhanced GAN Fuzzing",
        description: "Advanced GAN fuzzing with mutation options",
        command: (paramValues: Record<string, string>) => {
          const pcapFile = paramValues["pcap-file"] || "pcap/sa.pcap";
          const targetHost = paramValues["target-host"] || "10.0.0.2";
          const targetPort = paramValues["target-port"] || "38412";
          const nbCopies = paramValues["nb-copies"] || "2000";
          const mutationRate = paramValues["mutation-rate"] || "0.1";
          const seed = paramValues["seed"] || "42";
          
          return `docker run --rm ghcr.io/montimage/5greplay:latest replay -t "${pcapFile}" -X forward.target-ports=${targetPort} -X forward.target-hosts=${targetHost} -X forward.nb-copies=${nbCopies} -X forward.default=FORWARD -X gan.mutation-rate=${mutationRate} -X gan.seed=${seed}`;
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
          },
          "mutation-rate": {
            label: "Mutation Rate",
            type: "number",
            default: "0.1",
            description: "Mutation rate between 0 and 1"
          },
          "seed": {
            label: "Random Seed",
            type: "number",
            default: "42",
            description: "Seed for randomization"
          }
        }
      },
      {
        id: "gan-fuzzer-targeted",
        name: "Protocol-Specific GAN Fuzzing",
        description: "Target specific protocol fields for fuzzing",
        command: (paramValues: Record<string, string>) => {
          const pcapFile = paramValues["pcap-file"] || "pcap/sa.pcap";
          const targetHost = paramValues["target-host"] || "10.0.0.2";
          const targetPort = paramValues["target-port"] || "38412";
          const nbCopies = paramValues["nb-copies"] || "1000";
          const protocol = paramValues["protocol"] || "diameter";
          const field = paramValues["field"] || "avp";
          
          return `docker run --rm ghcr.io/montimage/5greplay:latest replay -t "${pcapFile}" -X forward.target-ports=${targetPort} -X forward.target-hosts=${targetHost} -X forward.nb-copies=${nbCopies} -X forward.default=FORWARD -X protocol=${protocol} -X field=${field}`;
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
            default: "1000"
          },
          "protocol": {
            label: "Protocol",
            type: "string",
            default: "diameter",
            description: "Protocol to target (diameter, http, etc.)"
          },
          "field": {
            label: "Field",
            type: "string",
            default: "avp",
            description: "Field to fuzz in the protocol"
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
    id: "ai-knx-fuzzer",
    name: "AI-Based KNX Fuzzer",
    description: "AI-powered fuzzer for KNX systems using machine learning techniques",
    type: "FUZZING",
    status: "in-progress",
    attacks: [
      {
        id: "ai-knx-fuzzer-basic",
        name: "Basic KNX Fuzzing",
        description: "Standard fuzzing for KNX systems",
        command: (paramValues: Record<string, string>) => {
          const targetIp = paramValues["target-ip"] || "192.168.1.1";
          return `docker -H unix:///var/run/docker.sock run --rm montimage/aiknxfuzzer:latest ${targetIp}`;
        },
        parameters: {
          "target-ip": {
            label: "Target IP",
            type: "string",
            default: "192.168.1.1"
          }
        }
      },
      {
        id: "ai-knx-fuzzer-advanced",
        name: "Advanced KNX Fuzzing",
        description: "Advanced AI-based fuzzing for KNX with deep learning",
        command: (paramValues: Record<string, string>) => {
          const targetIp = paramValues["target-ip"] || "192.168.1.1";
          const model = paramValues["model"] || "deeplearning";
          const iterations = paramValues["iterations"] || "1000";
          
          return `docker -H unix:///var/run/docker.sock run --rm montimage/aiknxfuzzer:latest ${targetIp} --model=${model} --iterations=${iterations}`;
        },
        parameters: {
          "target-ip": {
            label: "Target IP",
            type: "string",
            default: "192.168.1.1"
          },
          "model": {
            label: "AI Model",
            type: "string",
            default: "deeplearning",
            description: "AI model: basic, deeplearning, or gan"
          },
          "iterations": {
            label: "Iterations",
            type: "number",
            default: "1000",
            description: "Number of fuzzing iterations"
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
        command: () => "/home/hamdouni-mohamed/Montimage/start_maip.sh",
        parameters: {}
      }
    ],
    command: function() {
      return this.attacks[0].command();
    },
    parameters: {},
    iframe: {
      port: 3001,
      successMessage: "webpack compiled"
    },
    // Configuration pour les outputs multiples
    multiOutput: {
      enabled: true,
      outputs: [
        {
          id: "server",
          name: "MAIP Server",
          description: "Server backend with AI services",
          command: "/home/hamdouni-mohamed/Montimage/start_maip.sh",
          workingDirectory: "/home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/maip",
          successMessage: "[HTTP SERVER] MAIP Server started",
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
          workingDirectory: "/home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/maip",
          successMessage: "webpack compiled",
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
          
          return `bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} --mode exploitation'`;
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
          }
        }
      },
      {
        id: "shennina-training",
        name: "AI Training Mode",
        description: "Train Shennina AI on target environment",
        command: (paramValues: Record<string, string>) => {
          const target = paramValues["target"] || "172.17.0.2";
          const lhost = paramValues["lhost"] || "172.17.0.1";
          
          return `bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} --mode training'`;
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
          
          return `bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} --mode scan-only'`;
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
          command: "bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina/exfiltration-server && ./run-server.sh'",
          description: "Starts the exfiltration server for data collection"
        },
        {
          name: "MSF RPC Server", 
          command: "bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina && python3 scripts/run-msfrpc.py'",
          description: "Starts Metasploit RPC server for exploit execution"
        }
      ],
      initCommands: [
        {
          name: "Initialize Exploits Tree",
          command: "bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina && python3 shennina_standalone.py --initialize-exploits-tree'",
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
        command: () => "/home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/caldera/start_caldera.sh",
        parameters: {}
      }
    ],
    command: function() {
      return this.attacks[0].command();
    },
    parameters: {},
    iframe: {
      port: 8888,
      successMessage: "All systems ready, visit /enter"
    }
  }
];
