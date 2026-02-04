using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PropertyRegistration.Api.Extensions;
using PropertyRegistration.Api.Services;
using PropertyRegistration.Api.Hubs;
using PropertyRegistration.Core.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Get connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure NHibernate
builder.Services.AddNHibernate(connectionString);

// Register JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();

// Register RabbitMQ Service
builder.Services.AddSingleton<IRabbitMQService, RabbitMQService>();

// Register Backblaze Storage Service
builder.Services.AddScoped<IBackblazeStorageService, BackblazeStorageService>();

// Register Background Service for property updates
builder.Services.AddHostedService<PropertyUpdateBackgroundService>();

// Configure SignalR
builder.Services.AddSignalR();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
var issuer = jwtSettings["Issuer"] ?? "PropertyRegistrationApi";
var audience = jwtSettings["Audience"] ?? "PropertyRegistrationClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

// Configure CORS (frontend subdomain: property.magooltech.com)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "https://property.magooltech.com", "http://property.magooltech.com" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

Console.WriteLine("===========================================");
Console.WriteLine("=== BACKEND SERVER STARTING ===");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");
Console.WriteLine($"Timestamp: {DateTime.Now}");
Console.WriteLine("===========================================");

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Run database migrations and seed data
app.UseDatabaseMigration(connectionString);

// Add request logging middleware
app.Use(async (context, next) =>
{
    var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    var method = context.Request.Method;
    var path = context.Request.Path;
    var remoteIp = context.Connection.RemoteIpAddress;
    
    Console.WriteLine($"[{timestamp}] {method} {path} from {remoteIp}");
    
    await next();
    
    Console.WriteLine($"[{timestamp}] {method} {path} -> {context.Response.StatusCode}");
});

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Map SignalR Hub
app.MapHub<PropertyHub>("/hubs/property");

// Configure URLs to listen on all network interfaces for mobile app access
app.Urls.Add("http://0.0.0.0:9000");

Console.WriteLine("===========================================");
Console.WriteLine("=== BACKEND SERVER CONFIGURATION ===");
Console.WriteLine("Listening on: http://0.0.0.0:9000");
Console.WriteLine("API Base: http://0.0.0.0:9000/api");
Console.WriteLine($"CORS: Allowed origins: {string.Join(", ", allowedOrigins)}");
Console.WriteLine("===========================================");

app.Run();
