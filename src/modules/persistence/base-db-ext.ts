import { BaseDb } from "@llm-tools/embedjs";

export interface BaseDbExt extends BaseDb {
    indexinVectors(): Promise<void>;
}