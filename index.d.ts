// TODO: Figure out Hyperspace options
declare module "web4js" {
  // TODO: Support abstract-encoding
  export type Encoding = 'binary' | 'json' | 'utf-8'

  // TODO: Might want to spec out Chainstore?
  export type Chainstore = any

  // TODO: Maybe we should Type random-access-storage?
  export type Storage = any

  export interface SDKOptions {
    applicationName?: string;
    persist?: boolean;
    storage?: Storage
    chainstore?: Chainstore;
    chainstoreOpts?: ChainstoreOpts;
    chainOpts?: UnichainOptions;
    driveOpts?: BitdriveOptions;
    dnsOpts?: DNSOptions;
    swarmOpts?: BitswarmOptions | BitswarmWebOptions
  }

  export interface BitswarmOptions {
    maxPeers?: number
    ephemeral?: boolean
    bootstrap?: string[]
    preferredPort?: number
  }

  export interface BitswarmWebOptions {
    maxPeers?: number
    webrtcBootstrap?: string[]
    wsProxy?: string,
    wsReconnectDelay?: number
  }

  export interface DNSOptions {
    recordName?: string
    protocolRegex?: RegExp
    hashRegex?: RegExp
    txtRegex?: RegExp
  }

  export interface UnichainOptions {
    sparse? : boolean;
    eagerUpdate?: boolean
    valueEncoding?: Encoding
  }

  export interface BitdriveOptions {
    sparse?: boolean
  }

  export interface ChainstoreOpts {
    masterKey?: Buffer;
    ack?: boolean
  }

  export interface Peer {
    remotePublicKey: Buffer
  }

  export interface Extension<M> {
    send(message: M, peer: Peer) : void
    broadcast(message: M) : void
  }

  export interface ExtensionHandlers<M> {
    encoding?: Encoding
    onmessage (message: M, peer: Peer) : void
    onerror (error: Error) : void
  }

  export interface UnichainGetOptions {
    wait?: boolean
    timeout?: number
    valueEncoding: Encoding
  }

  export interface DownloadRange {
    start?: number
    end?: number
    linear?: boolean
    blocks?: number[]
  }

  export interface Node {
    index: number
    size: number
    hash: Buffer
  }

  export interface UpdateOptions {
    ifAvailable?: boolean
    minLength?: number
  }

  export interface UnichainReadStreamOpts {
    start?: number
    end?: number
    snapshot?: boolean
    tail?: boolean
    live?: boolean
    timeout?: number
    wait?: number
    batch?: number
  }

  export interface UnichainWriteStreamOpts {
    maxBlockSize?: number
  }

  export interface AuditResult {
    valid: number
    invalid: number
  }

  export interface NetworkStat {
    uploadedBytes: number
    uploadedBlocks: number
    downloadedBytes: number
    downloadedBlocks: number
  }

  export interface NetworkStats {
    totals: NetworkStat
    peers: NetworkStat[]
  }

  export interface Have {
    start?: number
    length? : number
    bitfield?: Buffer
  }

  export interface Unichain<E=Buffer> {
    readonly writable: boolean
    readonly readable: boolean
    readonly key: Buffer
    readonly discoveryKey: Buffer
    readonly length: number
    readonly byteLength: number
    readonly stats: NetworkStats
    readonly peers: Peer[]

    on(event: 'peer-add', listener: (peer: Peer) => any)
    on(event: 'peer-remove', listener: (peer: Peer) => any)
    on(event: 'peer-open', listener: (peer: Peer) => any)
    on(event: 'peer-ack', listener: (peer: Peer, have: Have) => any)
    on(event: 'ready', listener: () => any)
    on(event: 'error', listener: (error: Error) => any)
    on(event: 'upload', listener: (index, data: E) => any)
    on(event: 'append', listener: () => any)
    on(event: 'close', listener: () => any)

    once(event: 'peer-add', listener: (peer: Peer) => any)
    once(event: 'peer-remove', listener: (peer: Peer) => any)
    once(event: 'peer-open', listener: (peer: Peer) => any)
    once(event: 'peer-ack', listener: (peer: Peer, have: Have) => any)
    once(event: 'ready', listener: () => any)
    once(event: 'error', listener: (error: Error) => any)
    once(event: 'upload', listener: (index, data: E) => any)
    once(event: 'append', listener: () => any)
    once(event: 'close', listener: () => any)

    ready() : Promise<void>

    registerExtension<M=Buffer>(name: string, handlers: ExtensionHandlers<M>) : Extension<M>

    append(data: E) : Promise<number>
    get(index: number, options? : UnichainGetOptions) : Promise<E>
    getBatch(start: number, end: number, options?: UnichainGetOptions) : Promise<E[]>
    head(options?: UnichainGetOptions) : Promise<E>
    download(range?: DownloadRange): Promise<void>
    signature(index?: number) : Promise<Buffer>
    verify(index: number, signature: Buffer) : Promise<boolean>
    rootHashes(index: number) : Promise<Node[]>
    downloaded(start?: number, end?: number) : number
    has(index: number, end?: number) : boolean
    clear(start: number, end?: number) : Promise<void>
    seek(offset: number) : Promise<[number, number]>
    update(minLength? : UpdateOptions | number) : Promise<void>
    setDownloading(downloading: boolean) : void
    setUploading(uploading: boolean) : void

    createReadStream(options? : UnichainReadStreamOpts) : NodeJS.ReadableStream
    createWriteStream(options?: UnichainWriteStreamOpts) : NodeJS.WritableStream

    close() : Promise<void>
    destroyStorage(): Promise<void>
    audit() : Promise<AuditResult>
  }

  export interface TagMap {
    [id: string]: number
  }

  export interface ReadStreamOptions {
    start?: number
    end?: number
    length?: number
  }

  export interface EncodableOptions {
    encoding?: Encoding
  }

  export interface ReadDirOptions {
    recursive? : boolean
    noMounts? : boolean
  }

  export interface Stat {
    dev: number
    nlink: 1
    rdev: number
    blksize: number
    ino: number
    mode: number
    uid: number
    gid: number
    size: number
    offset: number
    blocks: number
    atime: string
    mtime: string
    ctime: string
    linkname: string
    isDirectory() : boolean
    isFile() : boolean
    isSymLink() : boolean
  }

  export interface MountInfo {
    feed: Unichain
    mountPath: string
    mountInfo: any
  }

  export type FD = number

  export interface Watcher {
    destroy() : void
  }

  export interface MountOptions {
    version?: number
  }

  export interface GetMountsOptions {
    memory?: boolean
  }

  export interface MountFeeds {
    path: string
    metadata: Unichain
    content: Unichain
  }

  export interface MountMap {
    [path: string]: MountFeeds
  }

  export interface Bitdrive {
    readonly version: number;
    readonly key: Buffer;
    readonly discoveryKey: Buffer;
    readonly writable: boolean;
    readonly peers: Peer[]

    on(event: 'ready', listener: () => any);
    on(event: 'error', listener: (error: Error) => any);
    on(event: 'update', listener: () => any);
    on(event: 'peer-add', listener: (peer: Peer) => any);
    on(event: 'peer-open', listener: (peer: Peer) => any);
    on(event: 'peer-remove', listener: (peer: Peer) => any);
    on(event: 'close', listener: () => any);

    once(event: 'ready', listener: () => any);
    once(event: 'error', listener: (error: Error) => any);
    once(event: 'update', listener: () => any);
    once(event: 'peer-add', listener: (peer: Peer) => any);
    once(event: 'peer-open', listener: (peer: Peer) => any);
    once(event: 'peer-remove', listener: (peer: Peer) => any);
    once(event: 'close', listener: () => any);

    registerExtension<M=Buffer>(name: string, handlers: ExtensionHandlers<M>) : Extension<M>

    ready() : Promise<void>

    checkout(version: number) : Bitdrive
    createTag(name: string, version?: number) : Promise<void>
    getTaggedVersion(name: string) : Promise<number>
    deleteTag(name) : Promise<void>
    getAllTags() : Promise<TagMap>

    download(path? : string) : Promise<void>

    createReadStream(name: string, options? : ReadStreamOptions) : NodeJS.ReadableStream
    readFile<E=Buffer>(name: string, options?: EncodableOptions) : Promise<E>

    createWriteStream(name) : NodeJS.WritableStream
    writeFile(name: string, data: Buffer | string, options: EncodableOptions) : Promise<void>

    unlink(name: string) : Promise<void>

    mkdir(name: string) : Promise<void>
    symlink(target: string, linkname: string) : Promise<void>
    rmdir(name: string): Promise<void>
    readdir(name: string, options?: ReadDirOptions) : Promise<string[] | Stat[]>

    stat(name: string) : Promise<Stat>
    lstat(name: string) : Promise<Stat>
    info(name: string) : Promise<MountInfo>
    access(name: string) : Promise<void>

    open(name: string, flags: string) : Promise<FD>
    read(fd: FD, buf: Buffer, offset: number, len: number, position: number) : Promise<void>
    write(fd: FD, buf: Buffer, offset: number, leng: number, position: number) : Promise<void>

    watch(name: string, onchage: () => void) : Watcher

    mount(name: string, key: Buffer, opts?: MountOptions) : Promise<void>
    unmount(name: string) : Promise<void>
    createMountStream(options?: MountOptions) : NodeJS.ReadableStream
    getAllMounts(options?: MountOptions) : Promise<MountMap>

    close(fd?: FD) : Promise<void>
    destroyStorage() : Promise<void>
  }

  export interface KeyPair {
    publicKey: Buffer,
    secretKey: Buffer
  }

  export interface SDKInstance {
    readonly keyPair: KeyPair

    Bitdrive(keyOrName: string, opts? : BitdriveOptions) : Bitdrive;
    Unichain<E=Buffer>(keyOrName: string, opts? : UnichainOptions) : Unichain<E>;

    resolveName(url: string) : Promise<string>
    deriveSecret(namespace: string, name: string) : Promise<Buffer>

    registerExtension<M=Buffer>(name: string, handlers: ExtensionHandlers<M>) : Extension<M>

    close() : Promise<void>;
  }

  export default function SDK(opts: SDKOptions) : Promise<SDKInstance>;
}
