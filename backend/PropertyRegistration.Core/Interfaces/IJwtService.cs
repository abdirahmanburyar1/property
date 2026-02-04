using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Core.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user, IEnumerable<string> roles);
}
