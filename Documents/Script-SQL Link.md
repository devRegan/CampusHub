// ===== DATABASE CONNECTION MAPPING =====

// 1. SUPABASE CLIENT → DATABASE CONNECTION
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// This connects to PostgreSQL database at: errhfqpieusjyhcqmkvf.supabase.co
// Uses anonymous key for authentication (RLS policies control access)

// ===== AUTHENTICATION → auth.users TABLE =====

async function signUp(email, password, fullName) {
    // SQL: INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { full_name: fullName }
        }
    });

    // Then creates profile record
    // SQL: INSERT INTO public.profiles (id, full_name, email)
    //      VALUES (data.user.id, fullName, email)
    const { error: profileError } = await supabase
        .from('profiles')  // → public.profiles table
        .insert([{
            id: data.user.id,
            full_name: fullName,
            email: email
        }]);
    
    // Triggers SQL:
    // 1. check_user_limit() function checks app_settings.current_users
    // 2. increment_user_count() increments app_settings.current_users
}

async function signIn(email, password) {
    // SQL: SELECT * FROM auth.users 
    //      WHERE email = ? AND encrypted_password = crypt(?, encrypted_password)
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
}

async function checkAuth() {
    // SQL: SELECT * FROM auth.users WHERE id = current_user_id
    const { data: { user } } = await supabase.auth.getUser();
}

// ===== PROFILES → public.profiles TABLE =====

async function loadProfile() {
    const user = await checkAuth();
    
    // SQL: SELECT * FROM public.profiles WHERE id = user.id LIMIT 1
    // RLS Policy: "Public profiles are viewable by everyone"
    const { data, error } = await supabase
        .from('profiles')  // → public.profiles table
        .select('*')
        .eq('id', user.id)  // WHERE id = user.id
        .single();          // LIMIT 1
}

async function updateProfile() {
    const user = await checkAuth();
    
    const profileData = {
        full_name: document.getElementById('fullNameEdit').value,
        nickname: document.getElementById('nickname').value,
        // ... other fields
    };

    // SQL: INSERT INTO public.profiles (id, full_name, nickname, ...)
    //      VALUES (user.id, ?, ?, ...)
    //      ON CONFLICT (id) DO UPDATE SET full_name = ?, nickname = ?, ...
    // RLS Policy: "Users can update their own profile" (auth.uid() = id)
    // Trigger: update_profiles_updated_at sets updated_at = NOW()
    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            ...profileData
        });
}

// ===== STORAGE → storage.objects TABLE & storage.buckets =====

async function uploadFile(file, folder) {
    const filePath = `${folder}/${fileName}`;
    
    // SQL: INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    //      VALUES ('media', filePath, auth.uid(), ...)
    // RLS Policy: "Allow all authenticated uploads" (bucket_id = 'media')
    // Bucket Config: max size 50MB, allowed MIME types checked
    const { data, error } = await supabase.storage
        .from('media')  // → storage.buckets WHERE id = 'media'
        .upload(filePath, file);

    // SQL: SELECT * FROM storage.objects WHERE bucket_id = 'media' AND name = filePath
    // Returns public URL based on bucket.public = true
    const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
}

// ===== POSTS → public.posts TABLE =====

async function createPost() {
    const user = await checkAuth();
    
    // Upload files first (see uploadFile above)
    // Then create post record
    
    let postData = {
        content: content,
        image_urls: imageUrls,  // TEXT[] array
        video_url: videoUrl,
        file_url: fileUrl,
        file_name: fileName
    };

    if (editingPostId) {
        // SQL: UPDATE public.posts 
        //      SET content = ?, image_urls = ?, video_url = ?, ...
        //      WHERE id = editingPostId AND user_id = user.id
        //      RETURNING *
        // RLS Policy: "Users can update their own posts" (auth.uid() = user_id)
        // Trigger: update_posts_updated_at sets updated_at = NOW()
        const result = await supabase
            .from('posts')
            .update(postData)
            .eq('id', editingPostId)
            .eq('user_id', user.id)
            .select();
    } else {
        // SQL: INSERT INTO public.posts (user_id, content, image_urls, ...)
        //      VALUES (user.id, ?, ?, ...)
        //      RETURNING *
        // RLS Policy: "Users can insert their own posts" (auth.uid() = user_id)
        postData.user_id = user.id;
        const result = await supabase
            .from('posts')
            .insert([postData])
            .select();
    }
}

async function loadPosts() {
    const user = await checkAuth();
    
    // SQL: SELECT posts.*, profiles.full_name, profiles.nickname
    //      FROM public.posts
    //      LEFT JOIN public.profiles ON posts.user_id = profiles.id
    //      ORDER BY posts.created_at DESC
    // RLS Policy: "Posts are viewable by all authenticated users"
    // Uses idx_posts_created_at index for performance
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (
                full_name,
                nickname
            )
        `)
        .order('created_at', { ascending: false });
}

async function deletePost(postId) {
    const user = await checkAuth();
    
    // SQL: DELETE FROM public.posts 
    //      WHERE id = postId AND user_id = user.id
    // RLS Policy: "Users can delete their own posts" (auth.uid() = user_id)
    // CASCADE: Files in storage remain (manual cleanup needed if desired)
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);
}

// ===== ROW LEVEL SECURITY (RLS) FLOW =====

/*
When any query executes, PostgreSQL checks RLS policies:

1. User signs in → JWT token generated with auth.uid()
2. Every API call includes JWT in header
3. PostgreSQL extracts auth.uid() from JWT
4. RLS policies evaluate:
   - SELECT: "Posts are viewable by all authenticated users" → true
   - INSERT: "Users can insert their own posts" → auth.uid() = user_id
   - UPDATE: "Users can update their own posts" → auth.uid() = user_id
   - DELETE: "Users can delete their own posts" → auth.uid() = user_id
5. If policy passes → query executes
6. If policy fails → error returned (403 forbidden)

Example:
- User A (id: abc-123) tries to delete post owned by User B (id: xyz-789)
- DELETE query: WHERE id = postId AND user_id = abc-123
- But post has user_id = xyz-789
- RLS policy USING (auth.uid() = user_id) → false
- Query returns 0 rows deleted, operation fails
*/

// ===== TRIGGERS EXECUTED =====

/*
Automatic SQL triggers on operations:

1. INSERT INTO profiles:
   - check_user_limit_trigger → calls check_user_limit()
     * Checks if current_users < max_users in app_settings
   - increment_user_count_trigger → calls increment_user_count()
     * UPDATE app_settings SET current_users = current_users + 1

2. UPDATE profiles:
   - update_profiles_updated_at → calls update_updated_at_column()
     * SET updated_at = NOW()

3. UPDATE posts:
   - update_posts_updated_at → calls update_updated_at_column()
     * SET updated_at = NOW()

4. DELETE FROM profiles:
   - decrement_user_count_trigger → calls decrement_user_count()
     * UPDATE app_settings SET current_users = current_users - 1
   - CASCADE DELETE: Deletes all posts by that user (ON DELETE CASCADE)
*/

// ===== INDEXES USED =====

/*
PostgreSQL automatically uses these indexes for performance:

1. idx_posts_user_id → speeds up: WHERE user_id = ?
2. idx_posts_created_at → speeds up: ORDER BY created_at DESC
3. idx_profiles_email → speeds up: WHERE email = ?
4. Primary keys (id) → automatic B-tree indexes
*/