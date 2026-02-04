using NHibernate;

namespace PropertyRegistration.Infrastructure.Data;

public class UnitOfWork : IUnitOfWork
{
    private readonly ISession _session;
    private ITransaction? _transaction;

    public UnitOfWork(ISessionFactoryProvider sessionFactoryProvider)
    {
        _session = sessionFactoryProvider.OpenSession();
    }

    public ISession Session => _session;

    public void BeginTransaction()
    {
        _transaction = _session.BeginTransaction();
    }

    public void Commit()
    {
        _transaction?.Commit();
    }

    public void Rollback()
    {
        _transaction?.Rollback();
    }

    public Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        _transaction = _session.BeginTransaction();
        return Task.CompletedTask;
    }

    public Task CommitAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            _transaction.Commit();
        }
        return Task.CompletedTask;
    }

    public Task RollbackAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            _transaction.Rollback();
        }
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _session?.Dispose();
    }
}
