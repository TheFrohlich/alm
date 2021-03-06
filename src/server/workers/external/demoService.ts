import * as sw from "../../utils/simpleWorker";
import * as cp from 'child_process';
import * as fsu from '../../utils/fsu';
import * as utils from '../../../common/utils';
import { TypedEvent } from '../../../common/events';

const workerPrefix = `[DEMO]`;
const nodeModulesFolder = fsu.travelUpTheDirectoryTreeTillYouFind(__dirname, "node_modules");
const tsNodeCompilerOptions = JSON.stringify({
    /**
     * Keep getting "cannot write file" ts / ts-node errors otherwise
     */
    allowJs: false,
    /** Node's not quite there yet */
    target: 'es6',
    module: 'commonjs',

    /** Hopefully prevent a few source map bugs */
    sourceMap: true,
    inlineSources: true,
});

class FileExecutor {
    constructor(filePath: string, private cb: (data: string) => void) {
        /** Find key paths */
        const tsNodePath = `${nodeModulesFolder}/ts-node/dist/bin.js`;

        /** In this dir */
        const cwd = utils.getDirectory(filePath);

        /** With these compiler options */
        const TS_NODE_COMPILER_OPTIONS = tsNodeCompilerOptions;

        /** Execute this */
        const toExec
            = [
                tsNodePath,
                filePath,
            ];

        const child = cp.spawn(process.execPath, toExec, {
            cwd,
            env: {
                TS_NODE_COMPILER_OPTIONS,
                /**
                 * Disable cache just because
                 */
                TS_NODE_CACHE: false,
                /**
                 * disableWarnings as we don't want it to prevent us from running the js
                 */
                TS_NODE_DISABLE_WARNINGS: true,
            }
        });
        this.child = child;

        child.stdout.on('data', (data) => {
            if (this.disposed) return;
            cb(data.toString());
        });

        child.stderr.on('data', (data) => {
            if (this.disposed) return;
            cb(data.toString());
        });

        child.on('close', (code) => {
            if (this.disposed) return;
            cb('---END---');
            console.log(workerPrefix, 'process ended');
        });
    }
    private disposed = false;
    private child?: cp.ChildProcess;
    dispose() {
        this.disposed = true;
        if (this.child) {
            this.child.kill('SIGINT');
            this.child = undefined;
        }
    }
}

export namespace WorkerImplementation {
    let executor: FileExecutor | undefined;
    export let currentFilePath = '';
    export const clearLiveDemo = new TypedEvent<{}>();
    export const liveDemoData = new TypedEvent<{ data: string }>();

    export const enableLiveDemo = ({filePath}: { filePath: string }) => {
        console.log(workerPrefix, `Started on filePath: ${filePath}`);
        if (executor) {
            executor.dispose();
        }
        clearLiveDemo.emit({});
        executor = new FileExecutor(filePath, (data) => {
            liveDemoData.emit({ data });
        });
        currentFilePath = filePath;
        return Promise.resolve({})
    };
    export const disableLiveDemo = () => {
        if (executor) {
            clearLiveDemo.emit({});
            executor.dispose();
            executor = undefined;
            currentFilePath = '';
        }
        return Promise.resolve({})
    }
}
