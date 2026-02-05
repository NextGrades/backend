/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createClient, createCluster, RediSearchSchema } from 'redis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom error for invalid namespace operations
 */
export class InvalidNamespaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNamespaceError';
  }
}

export interface Embeddings {
  embedDocuments(texts: string[]): Promise<number[][]>;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface IndexConfig {
  dims: number;
  distanceType?: 'cosine' | 'l2' | 'ip';
  fields?: string[];
  embed?: Embeddings;
  similarityThreshold?: number;
}

export interface TTLConfig {
  defaultTTL?: number;
}

export interface RedisStoreConfig {
  index?: IndexConfig;
  ttl?: TTLConfig;
}

export interface StoreItem<T = unknown> {
  value: T;
  key: string;
  namespace: string[];
  created_at: Date;
  updated_at: Date;
  score?: number;
}

export interface GetOptions {
  refreshTTL?: boolean;
}

export interface PutOptions {
  ttl?: number;
  index?: boolean | string[];
}

export interface SearchOptions {
  filter?: Record<string, unknown>;
  query?: string;
  limit?: number;
  offset?: number;
  refreshTTL?: boolean;
  similarityThreshold?: number;
}

export interface ListNamespacesOptions {
  prefix?: string[];
  suffix?: string[];
  maxDepth?: number;
  limit?: number;
  offset?: number;
}

export interface StoreStatistics {
  totalDocuments: number;
  namespaceCount: number;
  vectorDocuments?: number;
  indexInfo?: unknown;
}

export interface PutOperation {
  namespace: string[];
  key: string;
  value: unknown;
}

export interface GetOperation {
  namespace: string[];
  key: string;
}

export interface SearchOperation {
  namespacePrefix: string[];
  filter?: Record<string, unknown>;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ListNamespacesOperation {
  matchConditions?: Array<{
    matchType: 'prefix' | 'suffix';
    path: string[];
  }>;
  maxDepth?: number;
  limit?: number;
  offset?: number;
}

export type StoreOperation =
  | PutOperation
  | GetOperation
  | SearchOperation
  | ListNamespacesOperation;

interface RedisDocument {
  id: string;
  value: Record<string, unknown>;
}

interface RedisSearchResult {
  total: number;
  documents: RedisDocument[];
}

interface StoredDocument {
  prefix: string;
  key: string;
  value: unknown;
  created_at: number;
  updated_at: number;
}

interface VectorDocument {
  prefix: string;
  key: string;
  field_name: string;
  embedding: number[];
  created_at: number;
  updated_at: number;
}

/**
 * Type guard functions for operation types
 */
export function isPutOperation(op: unknown): op is PutOperation {
  const operation = op as Record<string, unknown>;
  return 'value' in operation && 'namespace' in operation && 'key' in operation;
}

export function isGetOperation(op: unknown): op is GetOperation {
  const operation = op as Record<string, unknown>;
  return (
    'namespace' in operation &&
    'key' in operation &&
    !('value' in operation) &&
    !('namespacePrefix' in operation) &&
    !('matchConditions' in operation)
  );
}

export function isSearchOperation(op: unknown): op is SearchOperation {
  const operation = op as Record<string, unknown>;
  return 'namespacePrefix' in operation;
}

export function isListNamespacesOperation(
  op: unknown,
): op is ListNamespacesOperation {
  const operation = op as Record<string, unknown>;
  return 'matchConditions' in operation;
}

/**
 * Internal class for evaluating filters against documents.
 * Supports MongoDB-style query operators.
 */
export class FilterBuilder {
  static matchesFilter(doc: unknown, filter: Record<string, unknown>): boolean {
    for (const [key, filterValue] of Object.entries(filter)) {
      if (!this.matchesFieldFilter(doc, key, filterValue)) {
        return false;
      }
    }
    return true;
  }

  static buildRedisSearchQuery(
    filter: Record<string, unknown>,
    prefix?: string,
  ): {
    query: string;
    useClientFilter: boolean;
  } {
    const queryParts: string[] = [];
    let useClientFilter = false;

    if (prefix) {
      const tokens = prefix.split(/[.-]/).filter((t) => t.length > 0);
      if (tokens.length > 0) {
        queryParts.push(`@prefix:(${tokens.join(' ')})`);
      }
    }

    for (const [_key, value] of Object.entries(filter)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).some((k) => k.startsWith('$'))
      ) {
        useClientFilter = true;
        break;
      }
    }

    if (queryParts.length === 0) {
      queryParts.push('*');
    }

    return {
      query: queryParts.join(' '),
      useClientFilter,
    };
  }

  static matchesFieldFilter(
    doc: unknown,
    key: string,
    filterValue: unknown,
  ): boolean {
    const actualValue = this.getNestedValue(doc, key);

    if (
      typeof filterValue === 'object' &&
      filterValue !== null &&
      !Array.isArray(filterValue) &&
      Object.keys(filterValue as Record<string, unknown>).some((k) =>
        k.startsWith('$'),
      )
    ) {
      return this.matchesOperators(
        actualValue,
        filterValue as Record<string, unknown>,
      );
    } else {
      return this.isEqual(actualValue, filterValue);
    }
  }

  static matchesOperators(
    actualValue: unknown,
    operators: Record<string, unknown>,
  ): boolean {
    for (const [operator, operatorValue] of Object.entries(operators)) {
      if (!this.matchesOperator(actualValue, operator, operatorValue)) {
        return false;
      }
    }
    return true;
  }

  static matchesOperator(
    actualValue: unknown,
    operator: string,
    operatorValue: unknown,
  ): boolean {
    switch (operator) {
      case '$eq':
        return this.isEqual(actualValue, operatorValue);
      case '$ne':
        return !this.isEqual(actualValue, operatorValue);
      case '$gt':
        return (
          actualValue !== undefined &&
          actualValue !== null &&
          Number(actualValue) > Number(operatorValue)
        );
      case '$gte':
        return (
          actualValue !== undefined &&
          actualValue !== null &&
          Number(actualValue) >= Number(operatorValue)
        );
      case '$lt':
        return (
          actualValue !== undefined &&
          actualValue !== null &&
          Number(actualValue) < Number(operatorValue)
        );
      case '$lte':
        return (
          actualValue !== undefined &&
          actualValue !== null &&
          Number(actualValue) <= Number(operatorValue)
        );
      case '$in':
        if (!Array.isArray(operatorValue)) return false;
        return operatorValue.some((val) => this.isEqual(actualValue, val));
      case '$nin':
        if (!Array.isArray(operatorValue)) return false;
        return !operatorValue.some((val) => this.isEqual(actualValue, val));
      case '$exists': {
        const exists = actualValue !== undefined;
        return operatorValue ? exists : !exists;
      }
      default:
        return false;
    }
  }

  static isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.isEqual(val, b[idx]));
    }

    if (Array.isArray(a) || Array.isArray(b)) {
      const arr = Array.isArray(a) ? a : (b as unknown[]);
      const val = Array.isArray(a) ? b : a;
      return arr.includes(val);
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => this.isEqual(aObj[key], bObj[key]));
    }

    return a == b;
  }

  static getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }
}

const REDIS_KEY_SEPARATOR = ':';
const STORE_PREFIX = 'store';
const STORE_VECTOR_PREFIX = 'store_vectors';

const SCHEMAS = [
  {
    index: 'store',
    prefix: STORE_PREFIX + REDIS_KEY_SEPARATOR,
    schema: {
      '$.prefix': {
        type: 'TEXT',
        AS: 'prefix',
      },
      '$.key': {
        type: 'TAG',
        AS: 'key',
      },
      '$.created_at': {
        type: 'NUMERIC',
        AS: 'created_at',
      },
      '$.updated_at': {
        type: 'NUMERIC',
        AS: 'updated_at',
      },
    },
  },
  {
    index: 'store_vectors',
    prefix: STORE_VECTOR_PREFIX + REDIS_KEY_SEPARATOR,
    schema: {
      '$.prefix': {
        type: 'TEXT',
        AS: 'prefix',
      },
      '$.key': {
        type: 'TAG',
        AS: 'key',
      },
      '$.field_name': {
        type: 'TAG',
        AS: 'field_name',
      },
      '$.embedding': {
        type: 'VECTOR',
        AS: 'embedding',
      },
      '$.created_at': {
        type: 'NUMERIC',
        AS: 'created_at',
      },
      '$.updated_at': {
        type: 'NUMERIC',
        AS: 'updated_at',
      },
    },
  },
] as const;

type RedisClient = ReturnType<typeof createClient>;
type RedisCluster = ReturnType<typeof createCluster>;

/**
 * RedisStore - A Redis-based storage solution with vector search capabilities
 *
 * REQUIREMENTS:
 * - Redis Stack OR Redis with RedisJSON and RediSearch modules
 * - RedisJSON module must be loaded for JSON.SET, JSON.GET commands
 * - RediSearch module must be loaded for FT.CREATE, FT.SEARCH commands
 */
export class RedisStore {
  client: RedisClient | RedisCluster;
  indexConfig?: IndexConfig;
  ttlConfig?: TTLConfig;
  embeddings?: Embeddings;

  constructor(client: RedisClient | RedisCluster, config?: RedisStoreConfig) {
    this.client = client;
    this.indexConfig = config?.index;
    this.ttlConfig = config?.ttl;
    if (this.indexConfig?.embed) {
      this.embeddings = this.indexConfig.embed;
    }
  }

  static async fromConnString(
    connString: string,
    config?: RedisStoreConfig,
  ): Promise<RedisStore> {
    const client = createClient({ url: connString });
    await client.connect();
    const store = new RedisStore(client, config);
    await store.setup();
    return store;
  }

  static async fromCluster(
    rootNodes: Array<{ url: string }>,
    config?: RedisStoreConfig,
  ): Promise<RedisStore> {
    const client = createCluster({ rootNodes });
    await client.connect();
    const store = new RedisStore(client, config);
    await store.setup();
    return store;
  }

  async setup(): Promise<void> {
    try {
      await this.client.ft.create(SCHEMAS[0].index, SCHEMAS[0].schema, {
        ON: 'JSON',
        PREFIX: SCHEMAS[0].prefix,
      });
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('unknown command')) {
        throw new Error(
          'RedisJSON module is not loaded. Please ensure you are using Redis Stack or have the RedisJSON module installed and loaded. ' +
            'Install: https://redis.io/docs/stack/get-started/install/',
        );
      }
      if (!err.message?.includes('Index already exists')) {
        console.error('Failed to create store index:', err.message);
      }
    }

    if (this.indexConfig) {
      const dims = this.indexConfig.dims;
      const distanceMetric =
        this.indexConfig.distanceType === 'cosine'
          ? 'COSINE'
          : this.indexConfig.distanceType === 'l2'
            ? 'L2'
            : this.indexConfig.distanceType === 'ip'
              ? 'IP'
              : 'COSINE';

      const vectorSchema: RediSearchSchema = {
        '$.prefix': {
          type: 'TEXT',
          AS: 'prefix',
        },
        '$.key': {
          type: 'TAG',
          AS: 'key',
        },
        '$.field_name': {
          type: 'TAG',
          AS: 'field_name',
        },
        '$.created_at': {
          type: 'NUMERIC',
          AS: 'created_at',
        },
        '$.updated_at': {
          type: 'NUMERIC',
          AS: 'updated_at',
        },
      };

      vectorSchema['$.embedding'] = {
        type: 'VECTOR',
        ALGORITHM: 'FLAT',
        TYPE: 'FLOAT32',
        DIM: dims,
        DISTANCE_METRIC: distanceMetric,
        AS: 'embedding',
      };

      try {
        await this.client.ft.create(SCHEMAS[1].index, vectorSchema, {
          ON: 'JSON',
          PREFIX: SCHEMAS[1].prefix,
        });
      } catch (error) {
        const err = error as Error;
        if (!err.message?.includes('Index already exists')) {
          console.error('Failed to create vector index:', err.message);
        }
      }
    }
  }

  async get<T = unknown>(
    namespace: string[],
    key: string,
    options?: GetOptions,
  ): Promise<StoreItem<T> | null> {
    const prefix = namespace.join('.');
    const tokens = prefix.split(/[.-]/).filter((t) => t.length > 0);
    const prefixQuery =
      tokens.length > 0 ? `@prefix:(${tokens.join(' ')})` : '*';

    let query: string;
    if (key === '') {
      query = prefixQuery;
    } else {
      const escapedKey = this.escapeTagValue(key);
      query = `(${prefixQuery}) (@key:{${escapedKey}})`;
    }

    try {
      const results = (await this.client.ft.search('store', query, {
        LIMIT: {
          from: 0,
          size: key === '' ? 100 : 1,
        },
      })) as unknown as RedisSearchResult;

      if (!results || !results.documents || results.documents.length === 0) {
        return null;
      }

      if (key === '') {
        for (const doc of results.documents) {
          const jsonDoc = doc.value as unknown as StoredDocument;
          if (jsonDoc.key === '' && jsonDoc.prefix === prefix) {
            const docId = doc.id;
            if (options?.refreshTTL) {
              await this.refreshItemTTL(docId);
            }
            return {
              value: jsonDoc.value as T,
              key: jsonDoc.key,
              namespace: jsonDoc.prefix.split('.'),
              created_at: new Date(jsonDoc.created_at / 1e6),
              updated_at: new Date(jsonDoc.updated_at / 1e6),
            };
          }
        }
        return null;
      }

      const doc = results.documents[0];
      const jsonDoc = doc.value as unknown as StoredDocument;
      const docId = doc.id;

      if (options?.refreshTTL) {
        await this.refreshItemTTL(docId);
      }

      return {
        value: jsonDoc.value as T,
        key: jsonDoc.key,
        namespace: jsonDoc.prefix.split('.'),
        created_at: new Date(jsonDoc.created_at / 1e6),
        updated_at: new Date(jsonDoc.updated_at / 1e6),
      };
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('no such index')) {
        return null;
      }
      throw error;
    }
  }

  async put<T = unknown>(
    namespace: string[],
    key: string,
    value: T | null,
    options?: PutOptions,
  ): Promise<void> {
    this.validateNamespace(namespace);

    const prefix = namespace.join('.');
    const docId = uuidv4();
    const now = Date.now() * 1e6 + Math.floor(performance.now() * 1e3);
    let createdAt = now;

    // Build search query
    const tokens = prefix.split(/[.-]/).filter((t) => t.length > 0);
    const prefixQuery =
      tokens.length > 0 ? `@prefix:(${tokens.join(' ')})` : '*';
    const escapedKey = this.escapeTagValue(key);
    const existingQuery = `(${prefixQuery}) (@key:{${escapedKey}})`;

    // Check for existing doc
    try {
      const existing = (await this.client.ft.search('store', existingQuery, {
        LIMIT: { from: 0, size: 1 },
      })) as unknown as RedisSearchResult;

      if (existing?.documents?.length) {
        const oldDocId = existing.documents[0].id;
        const existingDoc = (await this.client.json.get(oldDocId)) as Record<
          string,
          unknown
        > | null;

        if (existingDoc?.created_at) {
          createdAt = existingDoc.created_at as number;
        }

        await this.client.del(oldDocId);

        // Delete old vector doc if indexing is enabled
        if (this.indexConfig) {
          const oldUuid = oldDocId.split(':').pop();
          const oldVectorKey = `${STORE_VECTOR_PREFIX}${REDIS_KEY_SEPARATOR}${oldUuid}`;
          try {
            await this.client.del(oldVectorKey);
          } catch {
            // ignore errors
          }
        }
      }
    } catch {
      // ignore search errors
    }

    if (value === null) return;

    const storeKey = `${STORE_PREFIX}${REDIS_KEY_SEPARATOR}${docId}`;

    // Main document - let Redis client handle serialization
    const doc = {
      prefix,
      key,
      value,
      created_at: createdAt,
      updated_at: now,
    };

    await this.client.json.set(storeKey, '$', doc as any);

    // Index vectors if enabled
    if (this.indexConfig && this.embeddings && options?.index !== false) {
      const fieldsToIndex = Array.isArray(options?.index)
        ? options.index
        : this.indexConfig.fields || ['text'];

      const textsToEmbed: string[] = [];
      const fieldNames: string[] = [];

      const valueObj = value as Record<string, unknown>;
      for (const field of fieldsToIndex) {
        if (valueObj[field]) {
          textsToEmbed.push(valueObj[field] as string);
          fieldNames.push(field);
        }
      }

      if (textsToEmbed.length) {
        const embeddings = await this.embeddings.embedDocuments(textsToEmbed);

        for (let i = 0; i < embeddings.length; i++) {
          const vectorKey = `${STORE_VECTOR_PREFIX}${REDIS_KEY_SEPARATOR}${docId}`;

          const vectorDoc = {
            prefix,
            key,
            field_name: fieldNames[i],
            embedding: embeddings[i],
            created_at: now,
            updated_at: now,
          };

          await this.client.json.set(vectorKey, '$', vectorDoc as any);

          // Apply TTL
          const ttlMinutes = options?.ttl || this.ttlConfig?.defaultTTL;
          if (ttlMinutes) {
            await this.client.expire(vectorKey, Math.floor(ttlMinutes * 60));
          }
        }
      }
    }

    // Apply TTL to main doc
    const ttlMinutes = options?.ttl || this.ttlConfig?.defaultTTL;
    if (ttlMinutes) {
      await this.client.expire(storeKey, Math.floor(ttlMinutes * 60));
    }
  }

  async delete(namespace: string[], key: string): Promise<void> {
    await this.put(namespace, key, null);
  }

  async search<T = unknown>(
    namespacePrefix: string[],
    options?: SearchOptions,
  ): Promise<StoreItem<T>[]> {
    const prefix = namespacePrefix.join('.');
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    if (options?.query && this.indexConfig && this.embeddings) {
      const [embedding] = await this.embeddings.embedDocuments([options.query]);
      const queryStr = prefix ? `@prefix:${prefix.split(/[.-]/)[0]}*` : '*';
      const vectorBytes = Buffer.from(new Float32Array(embedding).buffer);

      try {
        const results = (await this.client.ft.search(
          'store_vectors',
          `(${queryStr})=>[KNN ${limit} @embedding $BLOB]`,
          {
            PARAMS: { BLOB: vectorBytes },
            DIALECT: 2,
            LIMIT: {
              from: offset,
              size: limit,
            },
            RETURN: ['prefix', 'key', '__embedding_score'],
          },
        )) as unknown as RedisSearchResult;

        const items: StoreItem<T>[] = [];
        for (const doc of results.documents) {
          const docUuid = doc.id.split(':').pop();
          const storeKey = `${STORE_PREFIX}${REDIS_KEY_SEPARATOR}${docUuid}`;
          const storeDoc = (await this.client.json.get(
            storeKey,
          )) as unknown as StoredDocument | null;

          if (storeDoc) {
            if (options.filter) {
              if (
                !FilterBuilder.matchesFilter(
                  storeDoc.value || {},
                  options.filter,
                )
              ) {
                continue;
              }
            }

            if (options.refreshTTL) {
              await this.refreshItemTTL(storeKey);
              await this.refreshItemTTL(doc.id);
            }

            const embeddingScore = doc.value.__embedding_score;
            const score = embeddingScore
              ? this.calculateSimilarityScore(
                  parseFloat(embeddingScore as string),
                )
              : 0;
            const threshold =
              options.similarityThreshold ??
              this.indexConfig?.similarityThreshold;

            if (threshold !== undefined && score < threshold) {
              continue;
            }

            items.push({
              value: storeDoc.value as T,
              key: storeDoc.key,
              namespace: storeDoc.prefix.split('.'),
              created_at: new Date(storeDoc.created_at / 1e6),
              updated_at: new Date(storeDoc.updated_at / 1e6),
              score,
            });
          }
        }

        return items;
      } catch (error) {
        const err = error as Error;
        if (err.message?.includes('no such index')) {
          return [];
        }
        throw error;
      }
    }

    let queryStr = '*';
    if (prefix) {
      const tokens = prefix.split(/[.-]/).filter((t) => t.length > 0);
      if (tokens.length > 0) {
        queryStr = `@prefix:(${tokens.join(' ')})`;
      }
    }

    try {
      const results = (await this.client.ft.search('store', queryStr, {
        LIMIT: {
          from: offset,
          size: limit,
        },
        SORTBY: {
          BY: 'created_at',
          DIRECTION: 'DESC',
        },
      })) as unknown as RedisSearchResult;

      const items: StoreItem<T>[] = [];
      for (const doc of results.documents) {
        const jsonDoc = doc.value as unknown as StoredDocument;

        if (options?.filter) {
          if (
            !FilterBuilder.matchesFilter(jsonDoc.value || {}, options.filter)
          ) {
            continue;
          }
        }

        if (options?.refreshTTL) {
          await this.refreshItemTTL(doc.id);
        }

        items.push({
          value: jsonDoc.value as T,
          key: jsonDoc.key,
          namespace: jsonDoc.prefix.split('.'),
          created_at: new Date(jsonDoc.created_at / 1e6),
          updated_at: new Date(jsonDoc.updated_at / 1e6),
        });
      }

      return items;
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('no such index')) {
        return [];
      }
      throw error;
    }
  }

  async listNamespaces(options?: ListNamespacesOptions): Promise<string[][]> {
    const query = '*';

    try {
      const results = (await this.client.ft.search('store', query, {
        LIMIT: {
          from: 0,
          size: 1000,
        },
        RETURN: ['prefix'],
      })) as unknown as RedisSearchResult;

      const namespaceSet = new Set<string>();

      for (const doc of results.documents) {
        const docValue = doc.value;
        const prefix = docValue.prefix as string;
        const parts = prefix.split('.');

        if (options?.prefix) {
          if (parts.length < options.prefix.length) continue;
          let matches = true;
          for (let i = 0; i < options.prefix.length; i++) {
            if (parts[i] !== options.prefix[i]) {
              matches = false;
              break;
            }
          }
          if (!matches) continue;
        }

        if (options?.suffix) {
          if (parts.length < options.suffix.length) continue;
          let matches = true;
          const startIdx = parts.length - options.suffix.length;
          for (let i = 0; i < options.suffix.length; i++) {
            if (parts[startIdx + i] !== options.suffix[i]) {
              matches = false;
              break;
            }
          }
          if (!matches) continue;
        }

        if (options?.maxDepth) {
          const truncated = parts.slice(0, options.maxDepth);
          namespaceSet.add(truncated.join('.'));
        } else {
          namespaceSet.add(prefix);
        }
      }

      let namespaces = Array.from(namespaceSet)
        .map((ns) => ns.split('.'))
        .sort((a, b) => a.join('.').localeCompare(b.join('.')));

      if (options?.offset || options?.limit) {
        const offset = options.offset || 0;
        const limit = options.limit || 10;
        namespaces = namespaces.slice(offset, offset + limit);
      }

      return namespaces;
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('no such index')) {
        return [];
      }
      throw error;
    }
  }

  async batch(
    ops: StoreOperation[],
  ): Promise<(StoreItem | StoreItem[] | string[][] | null)[]> {
    const results: (StoreItem | StoreItem[] | string[][] | null)[] = new Array(
      ops.length,
    ).fill(null);

    for (let idx = 0; idx < ops.length; idx++) {
      const op = ops[idx];

      if (isPutOperation(op)) {
        await this.put(op.namespace, op.key, op.value);
        results[idx] = null;
      } else if (isSearchOperation(op)) {
        results[idx] = await this.search(op.namespacePrefix, {
          filter: op.filter,
          query: op.query,
          limit: op.limit,
          offset: op.offset,
        });
      } else if (isListNamespacesOperation(op)) {
        let prefix: string[] | undefined = undefined;
        let suffix: string[] | undefined = undefined;

        if (op.matchConditions) {
          for (const condition of op.matchConditions) {
            if (condition.matchType === 'prefix') {
              prefix = condition.path;
            } else if (condition.matchType === 'suffix') {
              suffix = condition.path;
            }
          }
        }

        results[idx] = await this.listNamespaces({
          prefix,
          suffix,
          maxDepth: op.maxDepth,
          limit: op.limit,
          offset: op.offset,
        });
      } else if (isGetOperation(op)) {
        results[idx] = await this.get(op.namespace, op.key);
      } else {
        throw new Error(`Unknown operation type: ${JSON.stringify(op)}`);
      }
    }

    return results;
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  async getStatistics(): Promise<StoreStatistics> {
    const stats: StoreStatistics = {
      totalDocuments: 0,
      namespaceCount: 0,
    };

    try {
      const countResult = (await this.client.ft.search('store', '*', {
        LIMIT: {
          from: 0,
          size: 0,
        },
      })) as unknown as RedisSearchResult;

      stats.totalDocuments = countResult.total || 0;

      const namespaces = await this.listNamespaces({ limit: 1000 });
      stats.namespaceCount = namespaces.length;

      if (this.indexConfig) {
        try {
          const vectorResult = (await this.client.ft.search(
            'store_vectors',
            '*',
            {
              LIMIT: {
                from: 0,
                size: 0,
              },
            },
          )) as unknown as RedisSearchResult;
          stats.vectorDocuments = vectorResult.total || 0;
        } catch (error) {
          stats.vectorDocuments = 0;
        }

        try {
          stats.indexInfo = await this.client.ft.info('store');
        } catch (error) {
          // Ignore errors
        }
      }
    } catch (error) {
      const err = error as Error;
      if (!err.message?.includes('no such index')) {
        throw error;
      }
    }

    return stats;
  }

  validateNamespace(namespace: string[]): void {
    if (namespace.length === 0) {
      throw new InvalidNamespaceError('Namespace cannot be empty.');
    }

    for (const label of namespace) {
      if (typeof label !== 'string') {
        throw new InvalidNamespaceError(
          `Invalid namespace label '${String(label)}' found in ${namespace}. Namespace labels must be strings.`,
        );
      }

      if (label.includes('.')) {
        throw new InvalidNamespaceError(
          `Invalid namespace label '${label}' found in ${namespace}. Namespace labels cannot contain periods ('.').`,
        );
      }

      if (label === '') {
        throw new InvalidNamespaceError(
          `Namespace labels cannot be empty strings. Got ${label} in ${namespace}`,
        );
      }
    }

    if (namespace[0] === 'langgraph') {
      throw new InvalidNamespaceError(
        `Root label for namespace cannot be "langgraph". Got: ${namespace}`,
      );
    }
  }

  async refreshItemTTL(docId: string): Promise<void> {
    if (this.ttlConfig?.defaultTTL) {
      const ttlSeconds = Math.floor(this.ttlConfig.defaultTTL * 60);
      await this.client.expire(docId, ttlSeconds);

      const docUuid = docId.split(':').pop();
      const vectorKey = `${STORE_VECTOR_PREFIX}${REDIS_KEY_SEPARATOR}${docUuid}`;

      try {
        await this.client.expire(vectorKey, ttlSeconds);
      } catch (error) {
        // Ignore errors
      }
    }
  }

  escapeTagValue(value: string): string {
    if (value === '') {
      return '__EMPTY_STRING__';
    }
    return value
      .replace(/\\/g, '\\\\')
      .replace(/[-\s,.:<>{}[\]"';!@#$%^&*()+=~|?/]/g, '\\$&');
  }

  calculateSimilarityScore(distance: number): number {
    const metric = this.indexConfig?.distanceType || 'cosine';

    switch (metric) {
      case 'cosine':
        return Math.max(0, 1 - distance / 2);
      case 'l2':
        return Math.exp(-distance);
      case 'ip':
        return 1 / (1 + Math.exp(-distance));
      default:
        return Math.max(0, 1 - distance / 2);
    }
  }
}
