using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace PropertyRegistration.Api.Hubs;

[Authorize]
public class PropertyHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Console.WriteLine($"=== SIGNALR CONNECTION ===");
        Console.WriteLine($"Connection ID: {Context.ConnectionId}");
        Console.WriteLine($"User ID: {userId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"=== SIGNALR DISCONNECTION ===");
        Console.WriteLine($"Connection ID: {Context.ConnectionId}");
        if (exception != null)
        {
            Console.WriteLine($"Error: {exception.Message}");
        }
        await base.OnDisconnectedAsync(exception);
    }

    // Allow clients to subscribe to specific property updates
    public async Task SubscribeToProperty(string propertyId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"property_{propertyId}");
        Console.WriteLine($"Connection {Context.ConnectionId} subscribed to property_{propertyId}");
    }

    // Allow clients to unsubscribe from property updates
    public async Task UnsubscribeFromProperty(string propertyId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"property_{propertyId}");
        Console.WriteLine($"Connection {Context.ConnectionId} unsubscribed from property_{propertyId}");
    }
}
