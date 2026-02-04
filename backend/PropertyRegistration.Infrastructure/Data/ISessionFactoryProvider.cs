using NHibernate;

namespace PropertyRegistration.Infrastructure.Data;

public interface ISessionFactoryProvider
{
    ISessionFactory SessionFactory { get; }
    ISessionFactory GetSessionFactory();
    ISession OpenSession();
}
