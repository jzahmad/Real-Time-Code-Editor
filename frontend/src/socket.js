import * as signalR from '@microsoft/signalr';

export const initSocket = async () => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5290/chatHub")
        .withAutomaticReconnect()
        .build();

    await connection.start().catch(err => console.error('Connection failed: ', err));

    return connection;
};
