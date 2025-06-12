// Outils AI4Cyber uniquement
export interface AI4CyberTool {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  status: 'implemented' | 'in-progress' | 'not-implemented';
  dockerImage?: string;
  command: (params: Record<string, any>) => string;
  parameters: Record<string, {
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'target';
    default?: any;
    required?: boolean;
    description?: string;
    options?: string[];
  }>;
  estimatedDuration: string;
  tags: string[];
}

export const AI4CYBER_TOOLS: AI4CyberTool[] = [
  // FUZZING
  {
    id: 'gan-fuzzer',
    name: 'gan-fuzzer',
    displayName: 'GAN-Based Fuzzer',
    description: 'Replays PCAP files using GAN-based fuzzing.',
    category: 'fuzzing',
    status: 'implemented',
    dockerImage: 'ghcr.io/montimage/5greplay:latest',
    command: (params) => {
      const pcapFile = params['pcap-file'] || 'pcap/sa.pcap';
      const targetHost = params['target-host'] || '10.0.0.2';
      const targetPort = params['target-port'] || '38412';
      const nbCopies = params['nb-copies'] || '2000';
      
      return `docker run --rm ${params.dockerImage || 'ghcr.io/montimage/5greplay:latest'} replay -t "${pcapFile}" -X forward.target-ports=${targetPort} -X forward.target-hosts=${targetHost} -X forward.nb-copies=${nbCopies} -X forward.default=FORWARD`;
    },
    parameters: {
      'target-host': {
        label: 'Target',
        type: 'target',
        required: true,
        description: 'Target from scenario targets'
      },
      'target-port': {
        label: 'Target Port',
        type: 'number',
        default: 38412,
        description: 'Port to target'
      },
      'pcap-file': {
        label: 'PCAP File',
        type: 'string',
        default: 'pcap/sa.pcap',
        description: 'PCAP file to replay'
      },
      'nb-copies': {
        label: 'Number of Copies',
        type: 'number',
        default: 2000,
        description: 'Number of packet copies'
      }
    },
    estimatedDuration: '10-30 minutes',
    tags: ['fuzzing', 'gan', 'pcap', 'replay']
  },
  
  {
    id: 'ai-knx-fuzzer',
    name: 'ai-knx-fuzzer',
    displayName: 'AI-Based KNX Fuzzer',
    description: 'AI-powered fuzzer for KNX systems using machine learning techniques',
    category: 'fuzzing',
    status: 'in-progress',
    dockerImage: 'montimage/aiknxfuzzer:latest',
    command: (params) => {
      const targetIp = params['target-ip'] || '192.168.1.1';
      const model = params['model'];
      const iterations = params['iterations'];
      const dockerSocket = process.env.DOCKER_SOCKET || 'unix:///var/run/docker.sock';
      const dockerImage = params.dockerImage || 'montimage/aiknxfuzzer:latest';
      
      let cmd = `docker -H ${dockerSocket} run --rm ${dockerImage} ${targetIp}`;
      if (model) cmd += ` --model=${model}`;
      if (iterations) cmd += ` --iterations=${iterations}`;
      return cmd;
    },
    parameters: {
      'target-ip': {
        label: 'Target',
        type: 'target',
        required: true,
        description: 'KNX target from scenario targets'
      },
      'model': {
        label: 'AI Model',
        type: 'select',
        options: ['lstm', 'gru', 'transformer'],
        description: 'AI model to use for fuzzing'
      },
      'iterations': {
        label: 'Iterations',
        type: 'number',
        default: 1000,
        description: 'Number of fuzzing iterations'
      }
    },
    estimatedDuration: '30-120 minutes',
    tags: ['fuzzing', 'ai', 'knx', 'iot']
  },

  // FRAMEWORK
  {
    id: 'sheninna',
    name: 'sheninna',
    displayName: 'Sheninna',
    description: 'Advanced penetration testing using AI',
    category: 'framework',
    status: 'not-implemented',
    dockerImage: 'sheninna/pentest-ai',
    command: (params) => {
      const target = params['target'] || 'http://target.local';
      const intensity = params['intensity'] || 'high';
      const outputFile = params['output-file'] || 'output.txt';
      const dockerImage = params.dockerImage || 'sheninna/pentest-ai';
      return `docker run --rm ${dockerImage} --target ${target} --scan-type full --intensity ${intensity} --output ${outputFile}`;
    },
    parameters: {
      'target': {
        label: 'Target',
        type: 'target',
        required: true,
        description: 'Target from scenario targets'
      },
      'intensity': {
        label: 'Intensity',
        type: 'select',
        options: ['low', 'medium', 'high'],
        default: 'high',
        description: 'Scan intensity level'
      },
      'output-file': {
        label: 'Output File',
        type: 'string',
        default: 'output.txt',
        description: 'Output file name'
      }
    },
    estimatedDuration: '30-120 minutes',
    tags: ['framework', 'ai', 'pentest']
  }
];

// Catégories AI4Cyber
export const AI4CYBER_CATEGORIES = [
  { 
    id: 'all', 
    name: 'ALL', 
    count: AI4CYBER_TOOLS.length,
    description: 'All AI4Cyber tools'
  },
  { 
    id: 'fuzzing', 
    name: 'FUZZING', 
    count: AI4CYBER_TOOLS.filter(t => t.category === 'fuzzing').length,
    description: 'AI-powered fuzzing tools'
  },
  { 
    id: 'framework', 
    name: 'FRAMEWORK', 
    count: AI4CYBER_TOOLS.filter(t => t.category === 'framework').length,
    description: 'Complete attack frameworks'
  }
];

// Fonction pour obtenir les outils par catégorie
export const getAI4CyberToolsByCategory = (category?: string): AI4CyberTool[] => {
  if (!category || category === 'all') {
    return AI4CYBER_TOOLS;
  }
  return AI4CYBER_TOOLS.filter(tool => tool.category === category);
};

// Fonction pour obtenir un outil par ID
export const getAI4CyberToolById = (id: string): AI4CyberTool | undefined => {
  return AI4CYBER_TOOLS.find(tool => tool.id === id);
}; 