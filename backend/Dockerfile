FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 9000

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["PropertyRegistration.Api/PropertyRegistration.Api.csproj", "PropertyRegistration.Api/"]
COPY ["PropertyRegistration.Core/PropertyRegistration.Core.csproj", "PropertyRegistration.Core/"]
COPY ["PropertyRegistration.Infrastructure/PropertyRegistration.Infrastructure.csproj", "PropertyRegistration.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "PropertyRegistration.Api/PropertyRegistration.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/PropertyRegistration.Api"
RUN dotnet build "PropertyRegistration.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PropertyRegistration.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PropertyRegistration.Api.dll"]
