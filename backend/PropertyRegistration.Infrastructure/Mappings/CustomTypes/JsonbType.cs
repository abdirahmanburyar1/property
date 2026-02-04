using NHibernate;
using NHibernate.Engine;
using NHibernate.SqlTypes;
using NHibernate.UserTypes;
using System.Data;
using System.Data.Common;
using System.Text.Json;

namespace PropertyRegistration.Infrastructure.Mappings.CustomTypes;

public class JsonbType : IUserType
{
    public new bool Equals(object? x, object? y)
    {
        if (x == null && y == null) return true;
        if (x == null || y == null) return false;
        return x.Equals(y);
    }

    public int GetHashCode(object x)
    {
        return x?.GetHashCode() ?? 0;
    }

    public object? NullSafeGet(DbDataReader rs, string[] names, ISessionImplementor session, object owner)
    {
        var value = rs[names[0]];
        if (value == null || value == DBNull.Value)
            return null;

        var jsonString = value.ToString();
        if (string.IsNullOrEmpty(jsonString))
            return null;

        return JsonDocument.Parse(jsonString);
    }

    public void NullSafeSet(DbCommand cmd, object? value, int index, ISessionImplementor session)
    {
        if (value == null)
        {
            ((IDbDataParameter)cmd.Parameters[index]).Value = DBNull.Value;
        }
        else
        {
            var jsonDoc = (JsonDocument)value;
            ((IDbDataParameter)cmd.Parameters[index]).Value = jsonDoc.RootElement.GetRawText();
        }
    }

    public object? DeepCopy(object? value)
    {
        if (value == null) return null;
        var jsonDoc = (JsonDocument)value;
        return JsonDocument.Parse(jsonDoc.RootElement.GetRawText());
    }

    public object Replace(object original, object target, object owner)
    {
        return original;
    }

    public object Assemble(object cached, object owner)
    {
        return cached;
    }

    public object Disassemble(object value)
    {
        return value;
    }

    public SqlType[] SqlTypes => new[] { new SqlType(DbType.String) };
    public Type ReturnedType => typeof(JsonDocument);
    public bool IsMutable => false;
}
