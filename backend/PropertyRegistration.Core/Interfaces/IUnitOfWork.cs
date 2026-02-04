using System.Threading.Tasks;

namespace PropertyRegistration.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    System.Threading.Tasks.Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    System.Threading.Tasks.Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    System.Threading.Tasks.Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    System.Threading.Tasks.Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
