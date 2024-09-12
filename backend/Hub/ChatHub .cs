using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

public class ChatHub : Hub
{
    private static ConcurrentDictionary<string, string> userSocketMap = new ConcurrentDictionary<string, string>();
    private static ConcurrentDictionary<string, ConcurrentBag<string>> roomUserMap = new ConcurrentDictionary<string, ConcurrentBag<string>>();

    public class ClientInfo
    {
        public string SocketId { get; set; }
        public string Username { get; set; }
    }

    public class JoinMessage
    {
        public List<ClientInfo> Clients { get; set; }
        public string Username { get; set; }
        public string SocketId { get; set; }
    }

    public class CodeChangeMessage
    {
        public string Code { get; set; }
    }

    private static List<ClientInfo> GetAllConnectedClients(string roomId)
    {
        if (roomUserMap.TryGetValue(roomId, out var connectedClients))
        {
            return connectedClients
                .Select(socketId => new ClientInfo
                {
                    SocketId = socketId,
                    Username = userSocketMap[socketId]
                })
                .ToList();
        }
        return new List<ClientInfo>();
    }

    public async Task JoinRoom(string roomId, string username)
    {
        Console.WriteLine($"User {username} is joining room {roomId}");

        userSocketMap[Context.ConnectionId] = username;

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        roomUserMap.AddOrUpdate(roomId, 
            new ConcurrentBag<string> { Context.ConnectionId }, 
            (key, list) => { list.Add(Context.ConnectionId); return list; });

        var clients = GetAllConnectedClients(roomId);

        foreach (var client in clients)
        {
            await Clients.Client(client.SocketId).SendAsync("UserJoined", new JoinMessage
            {
                Clients = clients,
                Username = username,
                SocketId = Context.ConnectionId
            });
        }
    }

    public async Task CodeChange(string roomId, string code)
    {
        await Clients.Group(roomId).SendAsync("CodeChanged", new CodeChangeMessage
        {
            Code = code
        });
    }

    public async Task SyncCode(string socketId, string code)
    {
        await Clients.Client(socketId).SendAsync("SyncCode", new CodeChangeMessage
        {
            Code = code
        });
    }

    public override async Task OnDisconnectedAsync(System.Exception exception)
    {
        if (userSocketMap.TryRemove(Context.ConnectionId, out var username))
        {
            foreach (var room in roomUserMap.Where(room => room.Value.Contains(Context.ConnectionId)))
            {
                await Clients.Group(room.Key).SendAsync("UserLeft", Context.ConnectionId, username);

                room.Value.TryTake(out _);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}
