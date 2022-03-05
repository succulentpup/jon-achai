import Log from '@dazn/lambda-powertools-logger'; // it will be modified after integrating with lambda-powertools
import { APIGatewayProxyHandler } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import validator from '@middy/validator';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpSecurityHeaders from '@middy/http-security-headers';
import status from 'statuses';
import { incomingEventLogger, onErrorHandler } from '../helpers/middleware';

const WHITE_SPACES = 2;

const addToQueue = (queue: Array<string>,userId: string): number  => {
    if (queue.find((id) => id === userId)) {
        Log.debug('Duplicate user: ', { userId });
        return queue.length;
    }
    queue.push(userId);
    return queue.length;
};

const printQueue = (queue: Array<string>): boolean => {
    queue.forEach((user, index) => {
        Log.info(`${index}: ${user}`)
    })
    return true;
};

const removeUserByIdFromQueue = (queue: Array<string>, userId: string): Array<string> => {
    const userPosition = queue.findIndex((id) => (id === userId));
    if( userPosition > -1) queue.splice(userPosition, 1);
    return queue;
};

const removeUserByPositionFromQueue = (queue: Array<string>, userPosition: number): Array<string> => {
    if( userPosition > -1 && userPosition < queue.length) queue.splice(userPosition, 1);
    return queue;
};

const moveUserInQueue = (queue: Array<string>,fromPosition: number, toPosition: number): Array<string> => {
    if (fromPosition === toPosition) return queue;
    const queueLength = queue.length;
    if ((fromPosition > -1 && fromPosition < queueLength) && (toPosition > -1 && toPosition < queueLength)) {
        const userId = queue[fromPosition];
        queue.splice(toPosition,0, userId);
        if (fromPosition < toPosition) queue.splice(fromPosition, 1)
        if (fromPosition > toPosition) queue.splice(fromPosition+1,1);
    }
    return queue;
}

const swapUsersByPosition = (queue: Array<string>, position1: number, position2: number): Array<string> => {
    const queueLength = queue.length;
    if ((position1 > -1 && position1 < queueLength) && (position2 > -1 && position2 < queueLength)) {
        const temp = queue[position1];
        /* eslint-disable no-param-reassign */
        queue[position1] = queue[position2];
        /* eslint-disable no-param-reassign */
        queue[position2] = temp;
    }
    return queue;
};

export const index: APIGatewayProxyHandler = async (event) => {
    let usersQueue: string[] = [];
    const queueCommands = [
        'ADD,1','ADD,2','ADD,3','ADD,4','ADD,5','ADD,6','ADD,6',
        'PRINT',
        'REVERSE',
        'PRINT',
        'REMOVE_USER,2',
        'REMOVE_USER,9',
        'REMOVE_POSITION,0',
        'PRINT',
        'SWAP,0,1',
        'PRINT',
        'MOVE,3,1',
        'PRINT',
    ];
    queueCommands.forEach((inputCommand) => {
        const [operation, arg1, arg2] = inputCommand.split(',');
        if (operation === 'ADD') {
            const userPosition = addToQueue(usersQueue, arg1)
            Log.info('userPosition', { userPosition });
        } else if (operation === 'PRINT') {
            printQueue(usersQueue);
        } else if (operation === 'REVERSE') {
            usersQueue.reverse();
            Log.debug('Reversed queue');
        } else if (operation === 'REMOVE_USER') {
            usersQueue = removeUserByIdFromQueue(usersQueue, arg1);
        } else if (operation === 'REMOVE_POSITION') {
            usersQueue = removeUserByPositionFromQueue(usersQueue, +arg1);
        } else if (operation === 'SWAP') {
            usersQueue = swapUsersByPosition(usersQueue, +arg1, +arg2);
        } else if (operation === 'MOVE') {
            usersQueue = moveUserInQueue(usersQueue, +arg1, +arg2);
        }
    });
    // adding user

    await Promise.resolve();
    return {
        statusCode: status('OK') as number,
        body: JSON.stringify(
            {
                message: 'Go Serverless, Your function executed successfully!',
            },
            null,
            WHITE_SPACES,
        ),
    };
};

// -----------------------------------------------------------------------------------//
// ----------------------------Middy middleware---------------------------------------//
// -----------------------------------------------------------------------------------//

const inputSchema = {
    type: 'object',
    properties: {
        pathParameters: {
            type: ['object', 'null'],
            properties: {
                uid: { type: 'number' },
            },
            // required: ['uid'], // Insert here all required pathParameters
        },
    },
};

export const handler = middy(index)
    // eslint-disable-next-line max-len
    .use(httpEventNormalizer()) // Normalizes HTTP events by adding an empty object for queryStringParameters and pathParameters if they are missing.
    .use(httpHeaderNormalizer()) // Normalizes HTTP header names to their canonical format.
    .use(validator({ inputSchema })) // validates the input
    .use(cors())
    .use(httpSecurityHeaders());

handler.before(incomingEventLogger);
handler.onError(onErrorHandler);