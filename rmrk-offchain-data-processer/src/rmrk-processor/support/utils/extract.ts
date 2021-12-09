
export type ExtraCall = {
  section: string;
  method: string;
  args: string[];
}

export interface RemarkResult {
  value: string;
  caller: string;
  blockNumber: string;
  timestamp: Date;
  extra?: ExtraCall[];
}

export interface RemarkResultEntity extends RemarkResult {
  id: string;
}
