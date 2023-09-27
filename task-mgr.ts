/**
 * 任务的运行状态
 */
enum TaskStatus {
    idle = 0,
    busy = 1,
}
// 任务运行次数
let runTime = 0;
// 任务完成次数
let doneTime = 0
let status = TaskStatus.idle;

/**
 * 队列管理
 */
const queue = {
    tasks: [],
    get length() {
        return this.tasks.length;
    },
    set length(len: number) {
        this.tasks.length = len;
        this.length = len;
    },
    push(task: any[]) {
        this.tasks.push(task)
        this.event.emit('push');
    },
    shift() {
        return this.tasks.shift();
    },
    event: {
        evts: {},
        on(name, func) {
            const { evts } = this;
            if (evts[name]) {
                evts[name].push(func);
            } else {
                evts[name] = [func];
            }
        },
        emit(name) {
            const { evts } = this;
            if (evts[name]) {
                evts[name].forEach(func => {
                    typeof func === 'function' && func();
                })
            }
        }
    }
}
/**
 * 日志打印
 * @param procesStatus 
 * @param result 
 * @param status 
 */
const logger = (procesStatus, result, status) => {
    const { length } = queue;
    console.info(Date.now(), `[Task][${procesStatus}][${result}], task status: ${status}, task left: ${length}`);
}
/**
 * 将任务封箱到下个事件循环中
 * @param task 
 * @returns 
 */
function bufferWrap(task) {
    return new Promise(resolve => {
        setTimeout(async () => {
            await task();
            resolve(0);
        }, 0)
    })
}
/**
 * 设置任务运行状态 
 * @param istatus 
 */
function setStatus(istatus: TaskStatus) {
    status = istatus;
}
/**
 * hooks
 * @returns 
 */
export default function useTask() {
    // 当任务队表有新增时，触发 run 事件。
    queue.event.on('push', run);

    /**
     * 运行任务
     * @returns 
     */
    async function run() {
        // 1 >> 如果任务为空，或者 任务管理器处于非空闲状态，则不运行新的任务
        if (queue.length === 0 || status !== TaskStatus.idle) {
            logger('runing', 'cancel', status);
            return;
        }
        // 2 >> 如果任务管理器空闲，则取得队列中第一个（先进先出）
        const [id, name, task] = queue.shift();
        console.info(Date.now(), `[Task][runing][ready][${++runTime}][${name}] id: ${id}, task status: ${status}, task left: ${queue.length}`);
        // 3 >> 先任务管理器设置为 非空闲 状态
        setStatus(TaskStatus.busy)
        // 4 >> 将 任务 放入下一个事件循环中等待执行
        await bufferWrap(task);
        console.info(Date.now(), `[Task][runing][done][${++doneTime}][${name}] id: ${id}, left: ${queue.length}`);
        // 5 >> 任务执行完成后，将任务管理器设置为空间状态
        setStatus(TaskStatus.idle)
        run();
    }
    return [
        /**
         * 添加任务
         * @param param0 
         */
        function add({ name, task }: { name: string, task: (done) => void }) {
            const id = performance.now();
            console.info(Date.now(), `[Task][push][${name}] id: ${id}, total: ${queue.length}`);
            // 将任务封箱为 promisify,
            const itask = () => {
                return new Promise(resolve => {
                    task(resolve);
                })
            }
            // 任务入队
            queue.push([id, name, itask]);
        },
        /**
         * 清空队列中的任务
         */
        function clear() {
            queue.length = 0;
        }
    ]
}

