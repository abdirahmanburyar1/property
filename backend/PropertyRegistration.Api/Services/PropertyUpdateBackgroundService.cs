using Microsoft.AspNetCore.SignalR;
using PropertyRegistration.Api.Hubs;

namespace PropertyRegistration.Api.Services;

public class PropertyUpdateBackgroundService : BackgroundService
{
    private readonly ILogger<PropertyUpdateBackgroundService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public PropertyUpdateBackgroundService(
        ILogger<PropertyUpdateBackgroundService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Property Update Background Service started");

        // Wait a moment for the application to fully start
        await Task.Delay(2000, stoppingToken);

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var rabbitMQ = scope.ServiceProvider.GetRequiredService<IRabbitMQService>();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<PropertyHub>>();

            // Try to start consuming - RabbitMQService will handle if it's not available
            rabbitMQ.StartConsuming(async (message) =>
            {
                try
                {
                    _logger.LogInformation("Broadcasting property update via SignalR: PropertyId={PropertyId}, Type={UpdateType}",
                        message.PropertyId, message.UpdateType);

                    // Broadcast to specific property group
                    await hubContext.Clients
                        .Group($"property_{message.PropertyId}")
                        .SendAsync("PropertyUpdated", message, stoppingToken);

                    // Also broadcast to all clients (for property lists, dashboards, etc.)
                    await hubContext.Clients.All
                        .SendAsync("PropertyUpdated", message, stoppingToken);

                    _logger.LogInformation("Successfully broadcasted property update via SignalR");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error broadcasting property update via SignalR");
                }
            });

            _logger.LogInformation("Property Update Background Service setup complete");

            // Keep the service running
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Property Update Background Service encountered an error. Real-time updates may not be available.");
            // Don't crash the application - just log and continue
        }
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Property Update Background Service stopping");
        return base.StopAsync(cancellationToken);
    }
}
