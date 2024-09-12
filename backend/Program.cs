var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Enable CORS for localhost:3000
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000")
                   .AllowAnyHeader()
                   .AllowAnyMethod()
                   .AllowCredentials(); // Important for SignalR
        });
});

// Add SignalR service
builder.Services.AddSignalR();

var app = builder.Build();

// Use CORS policy
app.UseCors("AllowReactApp");

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

app.Run();
