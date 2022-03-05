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

const removeUserFromQueue = (queue: Array<string>, userId: string): Array<string> => {
    const userPosition = queue.findIndex((id) => (id === userId));
    if( userPosition > -1) queue.splice(userPosition, 1);
    return queue;
}

export const index: APIGatewayProxyHandler = async (event) => {
    let usersQueue: string[] = [];
    const queueCommands = [
        'ADD,1','ADD,2','ADD,3','ADD,4','ADD,5','ADD,6','ADD,6',
        'PRINT',
        'REVERSE',
        'REMOVE_USER,2',
        'REMOVE_USER,9',
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
            usersQueue = removeUserFromQueue(usersQueue, arg1);
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