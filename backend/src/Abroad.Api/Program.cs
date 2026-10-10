var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

const string FrontendCorsPolicy = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);

var api = app.MapGroup("/api");

api.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTimeOffset.UtcNow }))
   .WithName("GetHealth");

app.Run();

public partial class Program;
