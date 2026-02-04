using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace PropertyRegistration.Api.Services;

public interface IRabbitMQService
{
    void PublishPropertyUpdate(PropertyUpdateMessage message);
    void StartConsuming(Action<PropertyUpdateMessage> onMessageReceived);
    void Dispose();
}

public class RabbitMQService : IRabbitMQService, IDisposable
{
    private readonly IConnection? _connection;
    private readonly IModel? _channel;
    private readonly string _exchangeName = "property_updates";
    private readonly string _queueName = "property_updates_queue";
    private readonly ILogger<RabbitMQService> _logger;
    private readonly bool _isEnabled = false;

    public RabbitMQService(IConfiguration configuration, ILogger<RabbitMQService> logger)
    {
        _logger = logger;

        try
        {
            var factory = new ConnectionFactory
            {
                HostName = configuration["RabbitMQ:Host"] ?? "localhost",
                Port = int.Parse(configuration["RabbitMQ:Port"] ?? "5672"),
                UserName = configuration["RabbitMQ:Username"] ?? "guest",
                Password = configuration["RabbitMQ:Password"] ?? "guest",
                VirtualHost = configuration["RabbitMQ:VirtualHost"] ?? "/",
                // Connection settings
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10),
                RequestedHeartbeat = TimeSpan.FromSeconds(60)
            };

            _logger.LogInformation("Connecting to RabbitMQ at {Host}:{Port}", factory.HostName, factory.Port);

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            // Declare exchange (fanout for broadcasting to all consumers)
            _channel.ExchangeDeclare(
                exchange: _exchangeName,
                type: ExchangeType.Fanout,
                durable: true,
                autoDelete: false
            );

            // Declare queue
            _channel.QueueDeclare(
                queue: _queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );

            // Bind queue to exchange
            _channel.QueueBind(
                queue: _queueName,
                exchange: _exchangeName,
                routingKey: ""
            );

            _isEnabled = true;
            _logger.LogInformation("RabbitMQ connection established successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to RabbitMQ. Real-time updates will be disabled. To enable, install RabbitMQ and restart the application.");
            _logger.LogInformation("Application will continue to work normally. Coordinate updates will save but won't broadcast in real-time.");
            _isEnabled = false;
            // Don't throw - allow application to continue without RabbitMQ
        }
    }

    public void PublishPropertyUpdate(PropertyUpdateMessage message)
    {
        if (!_isEnabled || _channel == null)
        {
            _logger.LogDebug("RabbitMQ is disabled. Skipping message publish for PropertyId={PropertyId}", message.PropertyId);
            return;
        }

        try
        {
            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = _channel.CreateBasicProperties();
            properties.Persistent = true;
            properties.ContentType = "application/json";

            _channel.BasicPublish(
                exchange: _exchangeName,
                routingKey: "",
                basicProperties: properties,
                body: body
            );

            _logger.LogInformation("Published property update: PropertyId={PropertyId}, Type={UpdateType}", 
                message.PropertyId, message.UpdateType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish property update message");
        }
    }

    public void StartConsuming(Action<PropertyUpdateMessage> onMessageReceived)
    {
        if (!_isEnabled || _channel == null)
        {
            _logger.LogWarning("RabbitMQ is disabled. Message consuming will not start. Real-time updates are not available.");
            return;
        }

        try
        {
            var consumer = new RabbitMQ.Client.Events.EventingBasicConsumer(_channel);
            
            consumer.Received += (model, ea) =>
            {
                try
                {
                    var body = ea.Body.ToArray();
                    var json = Encoding.UTF8.GetString(body);
                    var message = JsonSerializer.Deserialize<PropertyUpdateMessage>(json);
                    
                    if (message != null)
                    {
                        _logger.LogInformation("Received property update: PropertyId={PropertyId}, Type={UpdateType}", 
                            message.PropertyId, message.UpdateType);
                        onMessageReceived(message);
                    }

                    _channel.BasicAck(ea.DeliveryTag, false);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing RabbitMQ message");
                    _channel.BasicNack(ea.DeliveryTag, false, true);
                }
            };

            _channel.BasicConsume(
                queue: _queueName,
                autoAck: false,
                consumer: consumer
            );

            _logger.LogInformation("Started consuming messages from RabbitMQ queue: {QueueName}", _queueName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start consuming RabbitMQ messages");
        }
    }

    public void Dispose()
    {
        if (!_isEnabled)
        {
            return;
        }

        try
        {
            _channel?.Close();
            _connection?.Close();
            _logger.LogInformation("RabbitMQ connection closed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing RabbitMQ connection");
        }
    }
}

public class PropertyUpdateMessage
{
    public string PropertyId { get; set; } = string.Empty;
    public string UpdateType { get; set; } = string.Empty; // "coordinates", "details", "status", etc.
    public DateTime Timestamp { get; set; }
    public object? Data { get; set; }
}
