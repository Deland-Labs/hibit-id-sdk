import { NetworkId } from './consensus/network';
import * as toml from 'toml';

const CURRENT_VERSION = 2;

interface INodeDescriptor {
  /**
   * The unique identifier of the node.
   */
  uid: string;

  /**
   * The URL of the node WebSocket (wRPC URL).
   */
  url: string;
}

interface IResolverRecord {
  address: string;
  enable?: boolean;
}

interface IResolverGroup {
  template: string;
  nodes: string[];
  enable?: boolean;
}

interface IResolverConfig {
  group: IResolverGroup[];
  resolver: IResolverRecord[];
}

function tryParseResolvers(tomlConfig: string): string[] {
  const config: IResolverConfig = toml.parse(tomlConfig);

  let resolvers = config.resolver.filter((resolver) => resolver.enable !== false).map((resolver) => resolver.address);

  const groups = config.group.filter((group) => group.enable !== false);

  for (const group of groups) {
    const { template, nodes } = group;
    for (const node of nodes) {
      resolvers.push(template.replace('*', node));
    }
  }

  return resolvers;
}

const RESOLVER_CONFIG = `[[resolver]]
enable = false
address = "http://127.0.0.1:8888"

[[group]]
template = "https://*.kaspa.stream"
nodes = ["eric","maxim","sean","troy"]

[[group]]
template = "https://*.kaspa.red"
nodes = ["john", "mike", "paul", "alex"]

[[group]]
template = "https://*.kaspa.green"
nodes = ["jake", "mark", "adam", "liam"]

[[group]]
template = "https://*.kaspa.blue"
nodes = ["noah", "ryan", "jack", "luke"]`;

class Resolver {
  private urls: string[];
  private tls: boolean;
  private public: boolean;

  constructor(urls: string[] | null = null, tls: boolean = false) {
    if (urls && urls.length === 0) {
      throw new Error('Resolver: Empty URL list supplied to the constructor.');
    }

    this.public = false;
    this.urls = urls || tryParseResolvers(RESOLVER_CONFIG);
    this.tls = tls;

    if (!urls) {
      this.public = true;
    }
  }

  static default(): Resolver {
    return new Resolver();
  }

  getUrls(): string[] | null {
    return this.public ? null : this.urls;
  }

  getTls(): boolean {
    return this.tls;
  }

  private tlsAsStr(): string {
    return this.tls ? 'tls' : 'any';
  }

  private makeUrl(url: string, networkId: NetworkId): string {
    const tls = this.tlsAsStr();
    return `${url}/v${CURRENT_VERSION}/kaspa/${networkId}/${tls}/wrpc/json`;
  }

  private async fetchNodeInfo(url: string, networkId: NetworkId): Promise<INodeDescriptor> {
    const fullUrl = this.makeUrl(url, networkId);
    try {
      const response = await fetch(fullUrl);
      return JSON.parse(await response.text());
    } catch (error) {
      throw new Error(`Failed to connect ${fullUrl}: ${error}`);
    }
  }

  private async fetch(networkId: NetworkId): Promise<INodeDescriptor> {
    const urls = [...this.urls];
    const errors = [];
    for (const url of urls) {
      try {
        return await this.fetchNodeInfo(url, networkId);
      } catch (error) {
        errors.push(error);
      }
    }
    throw new Error(`Failed to connect: ${errors}`);
  }

  async getNode(networkId: NetworkId): Promise<INodeDescriptor> {
    return this.fetch(networkId);
  }

  async getUrl(networkId: NetworkId): Promise<string> {
    const node = await this.fetch(networkId);
    return node.url;
  }
}

export { Resolver, tryParseResolvers };
