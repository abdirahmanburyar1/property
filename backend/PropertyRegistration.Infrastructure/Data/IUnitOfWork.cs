using NHibernate;

namespace PropertyRegistration.Infrastructure.Data;

public interface IUnitOfWork : IDisposable
{
    ISession Session { get; }
    void BeginTransaction();
    void Commit();
    void Rollback();
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitAsync(CancellationToken cancellationToken = default);
    Task RollbackAsync(CancellationToken cancellationToken = default);
}
