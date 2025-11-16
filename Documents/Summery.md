## Summary of JavaScript ↔ SQL Connection

| JavaScript Function | SQL Operation | Table(s) | RLS Policy |
|---------------------|---------------|----------|------------|
| `signUp()` | INSERT | `auth.users`, `profiles` | Users can insert own profile |
| `signIn()` | SELECT | `auth.users` | N/A (handled by auth) |
| `loadProfile()` | SELECT | `profiles` | Public profiles viewable |
| `updateProfile()` | UPSERT | `profiles` | Users can update own profile |
| `uploadFile()` | INSERT | `storage.objects` | Allow authenticated uploads |
| `createPost()` | INSERT | `posts` | Users can insert own posts |
| `createPost()` (edit) | UPDATE | `posts` | Users can update own posts |
| `loadPosts()` | SELECT + JOIN | `posts`, `profiles` | Posts viewable by all |
| `deletePost()` | DELETE | `posts` | Users can delete own posts |

---

### Detailed Connection Flow

#### 1. **Authentication Flow**
```javascript
signUp(email, password, fullName)
```
- **SQL**: `INSERT INTO auth.users` → Creates user account
- **SQL**: `INSERT INTO profiles` → Creates profile record
- **Triggers**: 
  - `check_user_limit_trigger` → Validates user limit
  - `increment_user_count_trigger` → Updates count

#### 2. **Profile Management**
```javascript
loadProfile()
```
- **SQL**: `SELECT * FROM profiles WHERE id = user.id`
- **RLS**: Checks "Public profiles are viewable by everyone"
```javascript
updateProfile()
```
- **SQL**: `INSERT ... ON CONFLICT UPDATE` (UPSERT operation)
- **RLS**: Checks `auth.uid() = id`
- **Trigger**: `update_profiles_updated_at` → Sets `updated_at = NOW()`

#### 3. **File Upload**
```javascript
uploadFile(file, folder)
```
- **SQL**: `INSERT INTO storage.objects`
- **Bucket**: `media` (public bucket)
- **RLS**: "Allow all authenticated uploads"
- **Returns**: Public URL from `storage.buckets`

#### 4. **Post Operations**
```javascript
createPost()
```
- **SQL**: `INSERT INTO posts` (new) or `UPDATE posts` (edit)
- **RLS**: Validates `auth.uid() = user_id`
- **Trigger**: `update_posts_updated_at` on UPDATE
```javascript
loadPosts()
```
- **SQL**: 
```sql
SELECT posts.*, profiles.full_name, profiles.nickname
FROM posts
LEFT JOIN profiles ON posts.user_id = profiles.id
ORDER BY posts.created_at DESC
```
- **Index**: Uses `idx_posts_created_at` for performance
```javascript
deletePost(postId)
```
- **SQL**: `DELETE FROM posts WHERE id = ? AND user_id = ?`
- **RLS**: "Users can delete their own posts"

---

### Row Level Security (RLS) Enforcement

Every database operation passes through RLS policies:

1. **JWT Token** → Contains `auth.uid()`
2. **Policy Evaluation** → PostgreSQL checks policies
3. **Access Control** → Allow/Deny based on policy

**Example**:
```javascript
// User A (id: abc-123) tries to edit User B's post (user_id: xyz-789)
await supabase.from('posts').update({...}).eq('id', postId).eq('user_id', 'abc-123')

// RLS Policy: USING (auth.uid() = user_id)
// Result: ❌ Fails - auth.uid() (abc-123) ≠ post.user_id (xyz-789)
```

---

### Database Triggers

Automatically execute on operations:

| Trigger | Event | Action |
|---------|-------|--------|
| `check_user_limit_trigger` | BEFORE INSERT profiles | Validates max users |
| `increment_user_count_trigger` | AFTER INSERT profiles | Increments counter |
| `decrement_user_count_trigger` | AFTER DELETE profiles | Decrements counter |
| `update_profiles_updated_at` | BEFORE UPDATE profiles | Sets `updated_at` |
| `update_posts_updated_at` | BEFORE UPDATE posts | Sets `updated_at` |

---

### Performance Indexes

| Index | Column(s) | Purpose |
|-------|-----------|---------|
| `idx_posts_user_id` | `posts.user_id` | Fast user post lookups |
| `idx_posts_created_at` | `posts.created_at` | Optimized sorting |
| `idx_profiles_email` | `profiles.email` | Fast email searches |
| Primary Keys | All `id` columns | Automatic B-tree indexes |