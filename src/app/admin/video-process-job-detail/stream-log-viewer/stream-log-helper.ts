import { LogType } from '../../video-process-manager/LogType';
import { getRemPixel } from '../../../../helpers/dom';

export function processLineForStreamLogViewer(line: LogType, maxCharacterPerLine: number, lines: LogType[]): void {
    line.time = new Date(line.time).toLocaleString();
    if (line.msg) {
        const msgList = line.msg.split('\\n');
        if (msgList.length > 1) {
            splitForTooLong({time: line.time, level: line.level, msg: msgList[0]}, maxCharacterPerLine, lines);
            for(let i = 1; i < msgList.length; i++) {
                splitForTooLong({time: null, level: line.level, msg: msgList[i]}, maxCharacterPerLine, lines);
            }
            return;
        }
    }
    splitForTooLong(line, maxCharacterPerLine, lines);
}

export function getMaxCharacterPerLineForContainer(containerElement: HTMLElement): number {
    const jobContainerWidth = containerElement.clientWidth - getRemPixel(16);
    const testDiv = document.createElement('div');
    testDiv.style.position = 'absolute';
    testDiv.style.opacity = '0.1';
    document.body.appendChild(testDiv);
    let currentWidth = 0;
    let i = 0;
    while (currentWidth < jobContainerWidth) {
        testDiv.innerHTML += 'n';
        currentWidth = testDiv.clientWidth;
        i++;
    }
    i--;
    document.body.removeChild(testDiv);
    return i;
}

function splitForTooLong(line: LogType, maxCharacterPerLine: number, lines: LogType[]): void {
    let time = line.time;
    if (line.msg.length >= maxCharacterPerLine) {
        let breakPointStart = 0;
        let breakPointEnd = maxCharacterPerLine;
        while(breakPointStart < breakPointEnd) {
            lines.push({time: time, level: line.level, msg: line.msg.substring(breakPointStart, breakPointEnd)});
            time = null;
            breakPointStart = breakPointEnd < line.msg.length ? breakPointEnd : line.msg.length;
            breakPointEnd = breakPointEnd + maxCharacterPerLine;
            breakPointEnd = breakPointEnd < line.msg.length ? breakPointEnd : line.msg.length;
        }
    } else {
        lines.push(line);
    }
}

