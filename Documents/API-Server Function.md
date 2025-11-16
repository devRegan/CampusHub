```bash
// ===== CONFIGURATION =====
const SUPABASE_URL = 'https://errhfqpieusjyhcqmkvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycmhmcXBpZXVzanloY3Fta3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjI5NDYsImV4cCI6MjA3ODc5ODk0Nn0.itCPW4NSpDHFA4M3luacuPI8WC6RcR3i1_sXFPL47Eg';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== AUTHENTICATION FUNCTIONS =====
async function signUp(email, password, fullName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                },
                emailRedirectTo: `${window.location.origin}/index.html`
            }
        });

        if (error) throw error;

        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        full_name: fullName,
                        email: email
                    }
                ]);

            if (profileError) {
                console.error('Profile creation error:', profileError);
            }
        }

        return { success: true, data: data };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('authPage').style.display = 'flex';
        showSignin();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('authPage').style.display = 'flex';
        return null;
    }
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    return user;
}

async function checkAuthRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        document.getElementById('authPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        showPage('feed');
    }
}

// ===== PROFILE FUNCTIONS =====
async function loadProfile() {
    try {
        const user = await checkAuth();
        if (!user) return;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const profile = data || {};
        // UI updates would go here
        return profile;

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile() {
    try {
        const user = await checkAuth();
        if (!user) return;

        const profileData = {
            full_name: document.getElementById('fullNameEdit').value,
            nickname: document.getElementById('nickname').value,
            age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null,
            gender: document.getElementById('gender').value,
            department: document.getElementById('department').value,
            class: document.getElementById('class').value,
            section: document.getElementById('section').value,
            hobby: document.getElementById('hobby').value,
            bio: document.getElementById('bio').value
        };

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                ...profileData
            });

        if (error) throw error;

        return { success: true };

    } catch (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
    }
}

// ===== FILE UPLOAD =====
async function uploadFile(file, folder) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file);

    if (error) {
        console.error('Upload error:', error);
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

    console.log('Uploaded file URL:', urlData.publicUrl);
    return urlData.publicUrl;
}

// ===== POST FUNCTIONS =====
async function createPost() {
    try {
        const user = await checkAuth();
        if (!user) return;

        const content = document.getElementById('postContent').value.trim();

        if (!content && uploadedFiles.images.length === 0 && !uploadedFiles.video && !uploadedFiles.file) {
            alert('Please add some content or media to your post');
            return;
        }

        let postData = {
            content: content
        };

        // Upload images
        if (uploadedFiles.images.length > 0) {
            const imageUrls = [];
            for (const img of uploadedFiles.images) {
                try {
                    const url = await uploadFile(img, 'images');
                    imageUrls.push(url);
                    console.log('Image uploaded:', url);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    throw new Error('Failed to upload image');
                }
            }
            postData.image_urls = imageUrls;
        }

        // Upload video
        if (uploadedFiles.video) {
            try {
                const videoUrl = await uploadFile(uploadedFiles.video, 'videos');
                postData.video_url = videoUrl;
                console.log('Video uploaded:', videoUrl);
            } catch (error) {
                console.error('Error uploading video:', error);
                throw new Error('Failed to upload video');
            }
        }

        // Upload file
        if (uploadedFiles.file) {
            try {
                const fileUrl = await uploadFile(uploadedFiles.file, 'files');
                postData.file_url = fileUrl;
                postData.file_name = uploadedFiles.file.name;
                console.log('File uploaded:', fileUrl);
            } catch (error) {
                console.error('Error uploading file:', error);
                throw new Error('Failed to upload file');
            }
        }

        console.log('Post data:', postData);

        let data, error;
        if (editingPostId) {
            // Update existing post
            console.log('Updating post ID:', editingPostId);
            const result = await supabase
                .from('posts')
                .update(postData)
                .eq('id', editingPostId)
                .eq('user_id', user.id)
                .select();
            data = result.data;
            error = result.error;
            
            if (error) {
                console.error('Update error details:', error);
            }
        } else {
            // Create new post
            postData.user_id = user.id;
            const result = await supabase
                .from('posts')
                .insert([postData])
                .select();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Error saving post:', error);
            throw error;
        }

        console.log('Post saved successfully:', data);
        return { success: true, data: data };

    } catch (error) {
        console.error('Error creating/updating post:', error);
        return { success: false, error: error.message };
    }
}

async function deletePost(postId) {
    try {
        console.log('Deleting post:', postId);
        
        const user = await checkAuth();
        if (!user) return;
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete error:', error);
            throw error;
        }

        console.log('Post deleted successfully');
        return { success: true };

    } catch (error) {
        console.error('Error deleting post:', error);
        return { success: false, error: error.message };
    }
}

async function loadPosts() {
    try {
        console.log('Starting to load posts...');
        
        const user = await checkAuth();
        if (!user) return;
        
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

        if (error) {
            console.error('Supabase error loading posts:', error);
            console.error('Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        console.log('Posts loaded successfully:', posts);
        console.log('Number of posts:', posts ? posts.length : 0);

        return posts;

    } catch (error) {
        console.error('Fatal error loading posts:', error);
        return { success: false, error: error.message };
    }
}
```