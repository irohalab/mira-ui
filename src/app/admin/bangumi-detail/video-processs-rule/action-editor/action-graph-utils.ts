import { ActionMap } from '../../../../entity/action-map';

type Dict<T> = {[key: string]: T};
function isCyclicUtil(actionId: string, actionMap: ActionMap, visited: Dict<boolean>, recurStack: Dict<boolean>): boolean {
    if (!visited[actionId]) {
        visited[actionId] = true;
        recurStack[actionId] = true;
        const action = actionMap[actionId];
        for(const actId of action.upstreamActionIds) {
            if (!visited[actId] && isCyclicUtil(actId, actionMap, visited, recurStack)) {
                return true;
            } else if (recurStack[actId]) {
                return true;
            }
        }
    }
    recurStack[actionId] = false;// remove the vertex from recursion stack
    return false;
}
export function isCyclicGraph(actionMap: ActionMap): boolean {
    const visited: Dict<boolean> = {};
    const recurStack: Dict<boolean> = {};
    const actionIdList = Object.keys(actionMap);
    for(const actionId of actionIdList) {
        if (!visited[actionId] && isCyclicUtil(actionId, actionMap, visited, recurStack)) {
            return true;
        }
    }
    return false;
}
