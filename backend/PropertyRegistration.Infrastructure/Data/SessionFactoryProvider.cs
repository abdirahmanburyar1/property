using NHibernate;

namespace PropertyRegistration.Infrastructure.Data;

public class SessionFactoryProvider : ISessionFactoryProvider
{
    private readonly ISessionFactory _sessionFactory;

    public SessionFactoryProvider(string connectionString)
    {
        _sessionFactory = NHibernateSessionFactory.GetSessionFactory(connectionString);
    }

    public ISessionFactory SessionFactory => _sessionFactory;

    public ISessionFactory GetSessionFactory()
    {
        return _sessionFactory;
    }

    public ISession OpenSession()
    {
        return _sessionFactory.OpenSession();
    }
}
