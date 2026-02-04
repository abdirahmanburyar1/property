using System.Security.Cryptography;
using System.Text;

namespace PropertyRegistration.Api.Services;

public interface IBackblazeStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string folder = "properties");
    Task<bool> DeleteFileAsync(string filePath);
    string GetFileUrl(string filePath);
    Task<Stream> DownloadFileAsync(string filePath);
}

public class BackblazeStorageService : IBackblazeStorageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<BackblazeStorageService> _logger;
    private readonly string? _applicationKeyId;
    private readonly string? _applicationKey;
    private readonly string? _bucketId;
    private readonly string? _bucketName;
    private readonly string? _baseUrl;
    private string? _authorizationToken;
    private string? _apiUrl;
    private string? _downloadUrl;
    private DateTime? _tokenExpiry;

    public BackblazeStorageService(IConfiguration configuration, ILogger<BackblazeStorageService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        // Support new format (BackblazeB2) with fallback to old format (Backblaze)
        _applicationKeyId = _configuration["BackblazeB2:KeyId"] ?? _configuration["Backblaze:ApplicationKeyId"];
        _applicationKey = _configuration["BackblazeB2:ApplicationKey"] ?? _configuration["Backblaze:ApplicationKey"];
        _bucketId = _configuration["BackblazeB2:BucketId"] ?? _configuration["Backblaze:BucketId"];
        _bucketName = _configuration["BackblazeB2:BucketName"] ?? _configuration["Backblaze:BucketName"];
        _baseUrl = _configuration["BackblazeB2:BaseUrl"] ?? _configuration["Backblaze:BaseUrl"] ?? "https://f000.backblazeb2.com";
        
        // Log configuration status (without exposing secrets)
        if (string.IsNullOrEmpty(_applicationKeyId) || string.IsNullOrEmpty(_applicationKey))
        {
            _logger.LogWarning("Backblaze credentials not configured. Image uploads will fail until configured.");
        }
        else
        {
            _logger.LogInformation("Backblaze storage service initialized. BucketId: {BucketId}", _bucketId ?? "Not set");
        }
    }

    private async Task<string> GetAuthorizationTokenAsync()
    {
        // Check if we have a valid token
        if (!string.IsNullOrEmpty(_authorizationToken) && _tokenExpiry.HasValue && _tokenExpiry.Value > DateTime.UtcNow.AddMinutes(5))
        {
            return _authorizationToken;
        }

        if (string.IsNullOrEmpty(_applicationKeyId) || string.IsNullOrEmpty(_applicationKey))
        {
            throw new InvalidOperationException("Backblaze credentials not configured");
        }

        try
        {
            using var client = new HttpClient();
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_applicationKeyId}:{_applicationKey}"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);

            var response = await client.GetAsync("https://api.backblazeb2.com/b2api/v2/b2_authorize_account");
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(jsonResponse);
            
            _authorizationToken = doc.RootElement.GetProperty("authorizationToken").GetString();
            _apiUrl = doc.RootElement.GetProperty("apiUrl").GetString();
            
            // Get downloadUrl if available (for public file access)
            if (doc.RootElement.TryGetProperty("downloadUrl", out var downloadUrlElement))
            {
                _downloadUrl = downloadUrlElement.GetString();
            }
            else
            {
                // Fallback: construct downloadUrl from apiUrl
                _downloadUrl = _apiUrl?.Replace("api", "f000") ?? _baseUrl;
            }
            
            _tokenExpiry = DateTime.UtcNow.AddHours(23); // Tokens are valid for 24 hours

            if (string.IsNullOrEmpty(_authorizationToken) || string.IsNullOrEmpty(_apiUrl))
            {
                throw new InvalidOperationException("Failed to obtain authorization token");
            }

            return _authorizationToken;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get Backblaze authorization token");
            throw;
        }
    }

    private async Task<string> GetUploadUrlAsync()
    {
        var token = await GetAuthorizationTokenAsync();
        
        if (string.IsNullOrEmpty(_bucketId))
        {
            throw new InvalidOperationException("Backblaze bucket ID not configured");
        }

        using var client = new HttpClient();
        // B2 API uses authorizationToken directly, not Bearer token
        // Use TryAddWithoutValidation to avoid header format validation issues
        if (!client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", token))
        {
            throw new InvalidOperationException("Failed to set Authorization header");
        }

        // Use POST for b2_get_upload_url with bucketId in body
        var requestBody = new
        {
            bucketId = _bucketId
        };

        var content = new StringContent(
            System.Text.Json.JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync($"{_apiUrl}/b2api/v2/b2_get_upload_url", content);
        response.EnsureSuccessStatusCode();

        var jsonResponse = await response.Content.ReadAsStringAsync();
        using var doc = System.Text.Json.JsonDocument.Parse(jsonResponse);
        
        var uploadUrl = doc.RootElement.GetProperty("uploadUrl").GetString();
        var uploadAuthorizationToken = doc.RootElement.GetProperty("authorizationToken").GetString();

        if (string.IsNullOrEmpty(uploadUrl) || string.IsNullOrEmpty(uploadAuthorizationToken))
        {
            throw new InvalidOperationException("Failed to get upload URL");
        }

        return $"{uploadUrl}|{uploadAuthorizationToken}";
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string folder = "properties")
    {
        try
        {
            // Generate unique file name
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var randomString = Guid.NewGuid().ToString("N")[..8];
            var fileExtension = Path.GetExtension(fileName);
            var sanitizedFileName = SanitizeFileName(Path.GetFileNameWithoutExtension(fileName));
            var uniqueFileName = $"{sanitizedFileName}_{timestamp}_{randomString}{fileExtension}";
            var filePath = $"{folder}/{uniqueFileName}";

            // Get upload URL and token
            var uploadInfo = await GetUploadUrlAsync();
            var parts = uploadInfo.Split('|');
            var uploadUrl = parts[0];
            var uploadAuthToken = parts[1];

            // Calculate SHA1 hash of file content
            fileStream.Position = 0;
            byte[] fileBytes;
            using (var memoryStream = new MemoryStream())
            {
                await fileStream.CopyToAsync(memoryStream);
                fileBytes = memoryStream.ToArray();
            }

            using var sha1 = SHA1.Create();
            var hashBytes = sha1.ComputeHash(fileBytes);
            var fileHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

            // Upload file using native B2 API
            using var client = new HttpClient();
            // B2 upload requires specific headers
            // Use TryAddWithoutValidation for Authorization to avoid header format validation issues
            if (!client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", uploadAuthToken))
            {
                throw new InvalidOperationException("Failed to set Authorization header");
            }
            client.DefaultRequestHeaders.Add("X-Bz-File-Name", Uri.EscapeDataString(filePath));
            client.DefaultRequestHeaders.Add("X-Bz-Content-Type", contentType);
            client.DefaultRequestHeaders.Add("X-Bz-Content-Sha1", fileHash);
            // Optional: Add file info metadata
            client.DefaultRequestHeaders.Add("X-Bz-Info-src_last_modified_millis", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString());

            // Set Content-Type on the request content itself (required by B2 API)
            var content = new ByteArrayContent(fileBytes);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
            var response = await client.PostAsync(uploadUrl, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Backblaze upload failed. Status: {StatusCode}, Response: {Response}", response.StatusCode, errorContent);
                throw new InvalidOperationException($"Failed to upload file to Backblaze: {response.StatusCode} - {errorContent}");
            }
            
            // Verify upload was successful by checking response
            var responseContent = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Backblaze upload response: {Response}", responseContent);

            _logger.LogInformation("File uploaded successfully to Backblaze: {FilePath}", filePath);
            return filePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file to Backblaze: {FileName}", fileName);
            throw;
        }
    }

    public async Task<bool> DeleteFileAsync(string filePath)
    {
        try
        {
            var token = await GetAuthorizationTokenAsync();
            
            if (string.IsNullOrEmpty(_bucketId))
            {
                throw new InvalidOperationException("Backblaze bucket ID not configured");
            }

            // First, get file info to get fileId
            using var client = new HttpClient();
            // B2 API uses authorizationToken directly, not Bearer token
            // Use TryAddWithoutValidation to avoid header format validation issues
            if (!client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", token))
            {
                throw new InvalidOperationException("Failed to set Authorization header");
            }

            // Use POST for b2_list_file_names with parameters in body
            var listRequestBody = new
            {
                bucketId = _bucketId,
                startFileName = filePath,
                maxFileCount = 1
            };

            var listContent = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(listRequestBody),
                Encoding.UTF8,
                "application/json"
            );

            var listResponse = await client.PostAsync($"{_apiUrl}/b2api/v2/b2_list_file_names", listContent);
            
            if (!listResponse.IsSuccessStatusCode)
            {
                return false;
            }

            var listJson = await listResponse.Content.ReadAsStringAsync();
            using var listDoc = System.Text.Json.JsonDocument.Parse(listJson);
            
            var files = listDoc.RootElement.GetProperty("files");
            if (files.GetArrayLength() == 0)
            {
                return false;
            }

            var file = files[0];
            if (file.GetProperty("fileName").GetString() != filePath)
            {
                return false;
            }

            var fileId = file.GetProperty("fileId").GetString();
            var fileName = file.GetProperty("fileName").GetString();

            // Delete the file using native B2 API
            var deleteRequest = new
            {
                fileId = fileId,
                fileName = fileName
            };

            var deleteContent = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(deleteRequest),
                Encoding.UTF8,
                "application/json"
            );

            // B2 API uses authorizationToken directly, not Bearer token
            client.DefaultRequestHeaders.Remove("Authorization");
            if (!client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", token))
            {
                throw new InvalidOperationException("Failed to set Authorization header");
            }

            var deleteResponse = await client.PostAsync($"{_apiUrl}/b2api/v2/b2_delete_file_version", deleteContent);
            return deleteResponse.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file from Backblaze: {FilePath}", filePath);
            return false;
        }
    }

    public string GetFileUrl(string filePath)
    {
        // Use downloadUrl from authorization if available (preferred for public access)
        if (!string.IsNullOrEmpty(_downloadUrl))
        {
            // Native B2 download URL format: https://f000.backblazeb2.com/file/bucket-name/path/to/file
            if (!string.IsNullOrEmpty(_bucketName))
            {
                // URL encode the file path to handle special characters
                var encodedPath = Uri.EscapeDataString(filePath).Replace("%2F", "/"); // Keep slashes as-is
                return $"{_downloadUrl}/file/{_bucketName}/{encodedPath}";
            }
        }

        // Fallback to configured baseUrl
        if (string.IsNullOrEmpty(_baseUrl))
        {
            throw new InvalidOperationException("Backblaze base URL not configured");
        }

        // Check if using S3-compatible endpoint format
        if (_baseUrl.Contains("s3."))
        {
            // S3-compatible URL format: https://s3.region.backblazeb2.com/bucket-name/path/to/file
            // Note: This requires the bucket to be public or use signed URLs
            if (string.IsNullOrEmpty(_bucketName))
            {
                throw new InvalidOperationException("Backblaze bucket name not configured");
            }
            var baseUrl = _baseUrl.TrimEnd('/');
            // URL encode the file path
            var encodedPath = Uri.EscapeDataString(filePath).Replace("%2F", "/"); // Keep slashes as-is
            return $"{baseUrl}/{_bucketName}/{encodedPath}";
        }
        else
        {
            // Native B2 file server format: https://f000.backblazeb2.com/file/bucket-name/path/to/file
            if (string.IsNullOrEmpty(_bucketName))
            {
                throw new InvalidOperationException("Backblaze bucket name not configured");
            }
            // URL encode the file path
            var encodedPath = Uri.EscapeDataString(filePath).Replace("%2F", "/"); // Keep slashes as-is
            return $"{_baseUrl}/file/{_bucketName}/{encodedPath}";
        }
    }

    public async Task<Stream> DownloadFileAsync(string filePath)
    {
        try
        {
            var token = await GetAuthorizationTokenAsync();
            
            if (string.IsNullOrEmpty(_bucketName))
            {
                throw new InvalidOperationException("Backblaze bucket name not configured");
            }

            // Use downloadUrl from authorization for authorized downloads
            var downloadUrl = _downloadUrl ?? _baseUrl;
            if (string.IsNullOrEmpty(downloadUrl))
            {
                throw new InvalidOperationException("Backblaze download URL not configured");
            }

            // Native B2 download URL format: https://f000.backblazeb2.com/file/bucket-name/path/to/file
            var url = $"{downloadUrl}/file/{_bucketName}/{Uri.EscapeDataString(filePath).Replace("%2F", "/")}";

            using var client = new HttpClient();
            // B2 API uses authorizationToken for authorized downloads
            if (!client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", token))
            {
                throw new InvalidOperationException("Failed to set Authorization header");
            }

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            // Read the content into a memory stream that won't be disposed
            var memoryStream = new MemoryStream();
            await response.Content.CopyToAsync(memoryStream);
            memoryStream.Position = 0;
            
            // Return a new stream that can be disposed independently
            return memoryStream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file from Backblaze: {FilePath}", filePath);
            throw;
        }
    }

    private string SanitizeFileName(string fileName)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = string.Join("_", fileName.Split(invalidChars, StringSplitOptions.RemoveEmptyEntries));
        return sanitized.Length > 50 ? sanitized[..50] : sanitized;
    }
}
