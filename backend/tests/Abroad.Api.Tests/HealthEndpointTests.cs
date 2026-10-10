using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Abroad.Api.Tests;

public class HealthEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_Health_ReturnsOk()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
