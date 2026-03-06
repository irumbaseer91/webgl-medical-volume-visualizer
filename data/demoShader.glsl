
\volume_shader.vs
#version 300 es
precision highp float;

in vec3 a_vertex;
in vec3 a_normal;
in vec2 a_coord;

out vec3 v_pos;
out vec3 v_normal;
out vec2 v_coord;

uniform mat4 u_mvp;

void main() {
    v_pos = a_vertex;
    v_normal = a_normal;
    v_coord = a_coord;
    gl_Position = u_mvp * vec4(v_pos, 1.0);
}


\volume_global_import
// Return point where the ray enters the box. If the ray originates inside the box it returns the origin.
vec3 rayOrigin(in vec3 ro, in vec3 rd){
    if(abs(ro.x) <= 1.0 && abs(ro.y) <= 1.0 && abs(ro.z) <= 1.0) return ro;
    vec3 ip;
    // Only one these 3 sides can hold the ray origin. The other 3 faces will never hold it
    vec3 sides = vec3(-sign(rd.x),-sign(rd.y),-sign(rd.z));
    for(int i=0; i<3; i++){
        float c = (sides[i] - ro[i]) / rd[i];
        ip[i] = sides[i];
        ip[(i+1)%3] = c*rd[(i+1)%3]+ro[(i+1)%3];
        ip[(i+2)%3] = c*rd[(i+2)%3]+ro[(i+2)%3];
        if(abs(ip[(i+1)%3]) <= 1.0 && abs(ip[(i+2)%3]) <= 1.0) break;
    }
    return ip;
}
// Non-uint textures of webgl2 aren't normalized by the GPU, we need to do that manually
vec4 normalizeVoxel(in vec4 v, in vec3 minmaxnormalize){
    if(minmaxnormalize.z == 1.0){
        v = (v - minmaxnormalize.x) / (minmaxnormalize.y - minmaxnormalize.x);
    }
    return v;
}
// Better voxel interpolation from iquilezles.org/www/articles/texture/texture.htm
// interpolate a value at a non-integer position
vec3 interpolationPosition(in vec3 p, in vec3 resolution){
    p = p*resolution + 0.5; // input position from world coordinates to voxel coordinates.
    vec3 i = floor(p); //integer coordinates
    vec3 f = p - i; //fractional part
    f = f*f*f*(f*(f*6.0-15.0)+10.0); 
    p = i + f ;
     return (p - 0.5)/resolution;  // final interpolation position back to world coordinates
}

// Define the getVoxelValue function
float getVoxelValue(vec3 texcoord) {
    return normalizeVoxel(vec4(texture(u_volume_texture, interpolationPosition(texcoord, u_volume_resolution))), u_volume_minmaxnormalize).x;
   // return normalizeVoxel(vec4(texture(u_volume_texture, texcoord)), u_volume_minmaxnormalize).x;
}

//Classification using a transfer function in a texture (float [0,1])
vec4 applyTransferFunction (in sampler2D tf, in float f){
    return texture(tf, vec2(f, 0.0));
}

//Pseudo random function from thebookofshaders.com/10/
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

vec3 computeGradientFD(vec3 texcoord, vec3 dim){
    vec3 stepX = vec3(dim.x, 0.0, 0.0);
    vec3 stepY = vec3(0.0, dim.y, 0.0);
    vec3 stepZ = vec3(0.0, 0.0, dim.z);

    float p = getVoxelValue(texcoord);

    float dx = getVoxelValue(texcoord+stepX);
    float dy = getVoxelValue(texcoord+stepY);
    float dz = getVoxelValue(texcoord+stepZ);

    return vec3(dx-p,dy-p,dz-p);
} 

 vec3 computeGradientCD(vec3 texcoord, vec3 dim){
    vec3 stepX = vec3(dim.x, 0.0, 0.0);
    vec3 stepY = vec3(0.0, dim.y, 0.0);
    vec3 stepZ = vec3(0.0, 0.0, dim.z);
    
    float gx1 = getVoxelValue(texcoord+stepX);
    float gx2 = getVoxelValue(texcoord-stepX);
    float gy1 = getVoxelValue(texcoord+stepY);
    float gy2 = getVoxelValue(texcoord-stepY); 
    float gz1 = getVoxelValue(texcoord+stepZ);
    float gz2 = getVoxelValue(texcoord-stepZ);
    return vec3(gx1 - gx2, gy1 - gy2, gz1 - gz2);
}

vec3 computeGradientFiltered(vec3 texcoord, vec3 dim){

    vec3 G0 = computeGradientCD(texcoord, dim);
    vec3 G1 = computeGradientCD(texcoord + vec3(-dim.x, -dim.y, -dim.z), dim);
    vec3 G2 = computeGradientCD(texcoord + vec3(+dim.x, +dim.y, +dim.z), dim);
    vec3 G3 = computeGradientCD(texcoord + vec3(-dim.x, +dim.y, -dim.z), dim);
    vec3 G4 = computeGradientCD(texcoord + vec3(+dim.x, -dim.y, +dim.z), dim);
    vec3 G5 = computeGradientCD(texcoord + vec3(-dim.x, -dim.y, +dim.z), dim);
    vec3 G6 = computeGradientCD(texcoord + vec3(+dim.x, +dim.y, -dim.z), dim);
    vec3 G7 = computeGradientCD(texcoord + vec3(-dim.x, +dim.y, +dim.z), dim);
    vec3 G8 = computeGradientCD(texcoord + vec3(+dim.x, -dim.y, -dim.z), dim);

    vec3 L0 = mix(mix(G1, G2, 0.5), mix(G3, G4, 0.5), 0.5);
    vec3 L1 = mix(mix(G5, G6, 0.5), mix(G7, G8, 0.5), 0.5);
    return mix(G0, mix(L0, L1, 0.5), 0.5);
}

vec4 computePhong(vec3 N, vec3 L, vec3 c, float op, float value, vec3 ray_sample){
    //Material, change for classify
    vec3 Ka = vec3(u_ambient);
	vec3 Kd = vec3(u_diffuse);
	vec3 Ks = vec3(u_specular);
	float n = u_shininessVal;
    
    //Light
	vec3 lightColor = vec3(1.0);

    // ambient contribution of light
    vec3 ambient = Ka * lightColor;

    // diffuse contribution of light
    float diffuseLight = max(dot(N, L), 0.0);
    //diffuseLight = diffuseLight * u_diffuse;
    vec3 diffuse = Kd * diffuseLight * lightColor *c;

    // specular contribution of light
    vec3 R = reflect(-L, N);      // Reflected light vector
    vec3 V = normalize(-ray_sample); // Vector to viewer
    //Halfway vector
	vec3 H = normalize(L + V);
    float specAngle = max(dot(N, H), 0.0);
    float specularLight = pow(specAngle, n);
    vec3 specular = Ks  * specularLight * lightColor * c ;
    return vec4(ambient + diffuse + specular,1.0);   
}

vec3 LambertianBRDF(vec3 diffuseColor) {
    return diffuseColor / 2.0;
}

vec3 PhongBRDF(vec3 ks, float shininess, vec3 L, vec3 V, vec3 N){
    vec3 R = reflect(-L, N);
    float norm = (shininess+2.0)/(2.0*3.14159265358979323846);
    float specularLight = pow(max(dot(R, V), 0.0), shininess);
  //  return specularLight *ks;
   // return (specularLight * ks) / (4.0 * PI);
    return (specularLight * ks) / dot(L, N);
}

vec3 CookTorranceBRDF(float F0, float roughness, vec3 L, vec3 V, vec3 N) {
     float k = 0.2;
      float Rs= 0.0;
     vec3 lightColor = vec3(1.0);

      float NdotL = max(dot(N, L), 0.0);
      //Halfway vector
      vec3 H = normalize(L + V);

     if(NdotL>0.0){
        float NdotH = max(0.0, dot(N, H));
        float NdotV = max(0.0, dot(N, V));
        float VdotH = max(0.0, dot(L, H));

        // Fresnel reflectance
        float F = pow(1.0 - VdotH, 5.0);
        F *= (1.0 - F0);
        F += F0;

        // Microfacet distribution by Beckmann
        float m_squared = roughness * roughness;
        float r1 = 1.0 / (4.0 * m_squared * pow(NdotH, 4.0));
        float r2 = (NdotH * NdotH - 1.0) / (m_squared * NdotH * NdotH);
        float D = r1 * exp(r2);

        // Geometric shadowing
        float two_NdotH = 2.0 * NdotH;
        float g1 = (two_NdotH * NdotV) / VdotH;
        float g2 = (two_NdotH * NdotL) / VdotH;
        float G = min(1.0, min(g1, g2));

        Rs = (F * D * G) / (PI * NdotL * NdotV);

        return vec3(NdotL * (k + Rs * (1.0 - k)));

       // lightCon = vec3(ambient + diffuse + specular);
    }
}

vec3 computeBRDF(vec3 N, vec3 L, vec3 c, float op, float value, vec3 ray_sample){
    //Material, change for classify
    vec3 Ka = vec3(u_ambient);
	vec3 Kd = vec3(u_diffuse);
	vec3 Ks = vec3(u_specular);
	float n = u_shininessVal;
    vec3 specular = vec3(0.0);
    vec3 diffuse = vec3(0.0);

   
    //Light
	vec3 lightColor = vec3(1.0);
    //Light contribution with materials
    vec3 lightCon = vec3(0.0);

    // Vector to viewer
    vec3 V = normalize(-ray_sample); 

    // ambient contribution of light
    vec3 ambient = Ka ;

    // diffuse contribution of light
    float diffuseLight = max(dot(N, L), 0.0);
   // diffuseLight = diffuseLight * u_diffuse;
   diffuse = Kd * diffuseLight * c;

    if(u_id_brdf== 0.0){ // Lambertian BRDF
        lightCon = LambertianBRDF(diffuse) + ambient;
        //lightCon = ambient + diffuse;
    }
    if(u_id_brdf== 1.0){  // Phong BRDF
        lightCon = ambient + PhongBRDF(Ks, n, L, V, N) + diffuse;
    }
    if(u_id_brdf== 2.0){  // Cook-Torrance BRDF
        // specular contribution of light
        lightCon = ambient + CookTorranceBRDF(F0_brdf, u_roughness_brdf, L, V, N) + diffuse;
    }
    if(u_id_brdf== 3.0){  // Oren-Nayar BRDF
            lightCon = vec3(ambient + diffuse);
    }
    if(u_id_brdf== 4.0){  // Blinn-Phong BRDF
            lightCon = vec3(ambient + diffuse);
    }
    if(u_id_brdf== 5.0){  // GGX BRDF
            lightCon = vec3(ambient + diffuse);
    }
    return lightCon;  
}

// if VolumeShadowOn
// henyey greenstein phase function
float phase_function(float cos_angle)
{
  // divide by 2.0 instead of 4pi to increase intensity
  return ((1.0-u_anisotropy2)/pow(1.0+u_anisotropy2-2.0*u_anisotropy*cos_angle, 1.5))/2.0;
}


\header
precision highp float;
precision highp sampler3D;
precision highp isampler3D;
precision highp usampler3D;

in vec3 v_pos;
in vec3 v_normal;
in vec2 v_coord;
uniform mat4 u_mvp;

//camera position
uniform vec3 u_camera_position;
uniform vec3 u_local_camera_position;

//texture space [0,1]
uniform sampler2D u_tf_texture;
uniform samplerCube u_cube_texture;
uniform isampler3D u_volume_texture;

uniform vec3 u_volume_resolution;
uniform vec3 u_volume_minmaxnormalize;


//constant
const float PI = 3.1415926535897932384626433832795;

//threshold value to render
uniform float u_threshold_value, u_gradientThreshold, u_extra_value, u_extra_value_1, u_extra_value_2, u_extra_value_3;

//optional uniforms
uniform float u_transperency, u_quality,u_brightness,u_boundCount, u_boundExp, u_silhCount, u_silhExp, u_edgeThresh, u_isoValue;
uniform vec4 u_background;

//material uniforms
uniform float u_id_interpolation, u_ambient, u_diffuse, u_specular, u_shininessVal, u_roughness_brdf, F0_brdf, u_id_brdf, u_ambient_brdf, u_diffuse_brdf, u_specular_brdf, u_shininessVal_brdf;

//light position
uniform float u_x, u_y, u_z, u_amb_fac, u_width, u_height;
uniform bool u_on, u_point_light, u_directional_light, u_spot_light,u_area_light, u_ambient_light, u_G, u_F;

//volume shadow
uniform float u_anisotropy, u_anisotropy2;
// cutting plane
uniform vec4 u_cuttingPlaneL;
uniform vec4 u_cuttingPlaneR;
uniform vec4 u_cuttingPlaneA;
uniform vec4 u_cuttingPlaneP;
uniform vec4 u_cuttingPlaneS;
uniform vec4 u_cuttingPlaneI;
uniform bool u_cuttingActiveL;
uniform bool u_cuttingActiveR;
uniform bool u_cuttingActiveA;
uniform bool u_cuttingActiveP;
uniform bool u_cuttingActiveS;
uniform bool u_cuttingActiveI;

//uniforms bool, render mode
uniform bool u_value_bool,  u_illumination, u_doBoundary, u_gradientOpacity, u_doSilhouette, u_doEdge,
 u_envReflection;

//output color
out vec4 color_final;
 

//Default shader
\volume_shader.fs
#version 300 es

#import header

//#volume N adds u_N_resolution, u_N_minmaxnormalize, u_N_texture
//#volume volume

//Implements rayOrigin, interpolationPosition, normalizeVoxel, getVoxel, applyTransferFunction and random functions
#import volume_global_import

void main() {
    // Compute ray origin and direction in volume space [-1,1]
    vec3 ray_origin = u_local_camera_position;
    vec3 ray_exit = v_pos;
    vec3 ray_direction = normalize(ray_exit - ray_origin);
    
    // Compute ray origin as a point on the volume space (surface or inside) to avoid unwanted computations
    ray_origin = rayOrigin(ray_origin, ray_direction);
    vec3 ray_sample = ray_origin; // ray_sample,a position along a ray that intersects the volume, the point that will march
    vec3 step_vector = ray_direction * u_quality; // ray direction is normalized and scaled to meet the level of detail dictated by a uniform.
    float step_length = length(step_vector);

    // Jittering: Introduce an offset in the ray starting position along the ray direction to reduce atrefacts in the visualization
    ray_sample += step_vector* random(gl_FragCoord.xy);

    // Initialize cdest vec4 to store color
    vec4 color_accumulated = vec4(0.0);
    vec4 color_step = vec4(0.0);
    vec4 color_i = vec4(0.0);

    // Local variables
    vec3 grad_pos = vec3(0.0);
    float grad_mag = 0.0;  
    float grad_mag_nor = 0.0;
    float op = 0.0;

    // Use raymarching algorithm
    for(int i=0; i<300; i++){
        if((!u_cuttingActiveL || (u_cuttingPlaneL.x*ray_sample.x + u_cuttingPlaneL.y*ray_sample.y + u_cuttingPlaneL.z*ray_sample.z + u_cuttingPlaneL.w > 0.0))
        &&(!u_cuttingActiveR || (u_cuttingPlaneR.x*ray_sample.x + u_cuttingPlaneR.y*ray_sample.y + u_cuttingPlaneR.z*ray_sample.z + u_cuttingPlaneR.w > 0.0))
        &&(!u_cuttingActiveA || (u_cuttingPlaneA.x*ray_sample.x + u_cuttingPlaneA.y*ray_sample.y + u_cuttingPlaneA.z*ray_sample.z + u_cuttingPlaneA.w > 0.0))
        &&(!u_cuttingActiveP || (u_cuttingPlaneP.x*ray_sample.x + u_cuttingPlaneP.y*ray_sample.y + u_cuttingPlaneP.z*ray_sample.z + u_cuttingPlaneP.w > 0.0))
        &&(!u_cuttingActiveS || (u_cuttingPlaneS.x*ray_sample.x + u_cuttingPlaneS.y*ray_sample.y + u_cuttingPlaneS.z*ray_sample.z + u_cuttingPlaneS.w > 0.0))
        &&(!u_cuttingActiveI || (u_cuttingPlaneI.x*ray_sample.x + u_cuttingPlaneI.y*ray_sample.y + u_cuttingPlaneI.z*ray_sample.z + u_cuttingPlaneI.w > 0.0))){
            
            // Interpolation
            vec3 voxel_sample = (ray_sample + vec3(1.0))/2.0; //Voxel coordinates in texture space [0, 1]
            
            float f = getVoxelValue(voxel_sample);
            
            float value = f;
            if(value < u_threshold_value){
                ray_sample += step_vector;
                vec3 absrs = abs(ray_sample);
                if(absrs.x > 1.0 || absrs.y > 1.0 || absrs.z > 1.0) 
                    break;
                if(color_accumulated.w >= 1.0) 
                    break; 
                continue;
            }

            vec3 dimension = vec3(step_length);
        //  vec3 grad = computeGradientCD(voxel_sample, dimension);
          //vec3 grad =  computeGradientFiltered(voxel_sample, dimension);

            vec3 grad = computeGradientFD(voxel_sample, dimension);
            //  vec3 grad = vec3(1.0,1.0,1.0);
            grad_pos= (0.5/step_length) * grad;
            grad_mag = length(grad_pos);
            grad_mag_nor = normalize(grad_mag);
            vec3 grad_pos_nor = normalize(grad_pos);
            
            color_i = texture(u_tf_texture,vec2(value,0.0));
            color_i.rgb = color_i.rgb / 0.512;

             color_i = vec4(color_i.rgb, grad_mag_nor);
             color_i.a += 0.493*pow(grad_mag_nor/0.2 ,0.561);
            
            //Calculate the angle between the viewer and the gradient in eye space
	        //The viewer always looks down 0,0,-1 in eye space
	        float dotView = dot(vec3(0.0,0.0,-1.0), grad_pos_nor);

            if(u_gradientOpacity){
                // gradient magnitude used as opacity
                color_i = vec4(color_i.rgb, grad_mag_nor);
            }
            if(u_doBoundary){
                 //So magnitudes of 0 will add no opaqueness, magnitudes
                 //of 1 will add the maximum amount of opaqueness.(do boundry) boundary enhancement
                 color_i.a += u_boundCount*pow(grad_mag_nor/0.2 ,u_boundExp);
            }
            if(u_doSilhouette){
                color_i.a += u_silhCount*pow(1.0-abs(dotView),u_silhExp); 
            }
            if(u_doEdge){
                //We make very perpendicular voxels black, and lesser perpendicular voxels
		        //decreasingly dark until the value is below the threshold, when no
                //enhancement is performed.
            float edgeVal = pow(1.0-abs(dotView),0.2);
	    	if(edgeVal >= u_edgeThresh)
            color_i.rgb = mix(color_i.rgb, vec3(0.0,0.0,0.0), pow((edgeVal-u_edgeThresh)/(1.0-0.5),u_edgeThresh));
            }

            color_i.rgb = color_i.rgb *u_transperency; 
            //transparency, applied this way to avoid color bleeding

            // white dots due to low sample rate.. increase quality
            // Compositing
          
            color_step = step_length  * color_i * (1.0 - color_accumulated.w +  u_brightness/15.0); 
            color_accumulated += color_step;
            
            if(color_accumulated.w >= 1.0) break;        
            }     
        ray_sample += step_vector;
        vec3 absrs = abs(ray_sample);
        if(absrs.x > 1.0 || absrs.y > 1.0 || absrs.z > 1.0) break;
    }
    // Final color
    color_final = color_accumulated;
}

\volume_local_illumination.fs
#version 300 es

#import header

//Implements rayOrigin, interpolationPosition, normalizeVoxel, getVoxel, applyTransferFunction and random functions
#import volume_global_import

 void main() {
    // Compute ray origin and direction in volume space [-1,1]
    vec3 ray_origin = u_local_camera_position;
    vec3 ray_exit = v_pos;
    vec3 ray_direction = normalize(ray_exit - ray_origin);

    // Compute ray origin as a point on the volume space (surface or inside)
    ray_origin = rayOrigin(ray_origin, ray_direction);
    vec3 ray_sample = ray_origin;
    vec3 step_vector = ray_direction * u_quality;
    float step_length = length(step_vector);

    // Jittering: Introduce an offset in the ray starting position along the ray direction
     ray_sample += step_vector*random(gl_FragCoord.xy);

    bool hit = false;

    // Initialize cdest vec4 to store color
    vec4 color_accumulated = vec4(0.0);
    vec4 color_step = vec4(0.0);
    vec4 color_i = vec4(0.0);
    vec4 environment_color = vec4(0.0);
    // Light position vector
    vec3 light_pos = vec3(u_x, u_y, u_z);

    // Local variables
    vec3 grad_pos = vec3(0.0);
    float grad_mag = 0.0;
    float grad_mag_nor = 0.0;
    //vec3 specular = vec3(0.0);

    // Use raymarching algorithm
    for(int i=0; i<300; i++){
        if((!u_cuttingActiveL || (u_cuttingPlaneL.x*ray_sample.x + u_cuttingPlaneL.y*ray_sample.y + u_cuttingPlaneL.z*ray_sample.z + u_cuttingPlaneL.w > 0.0))
        &&(!u_cuttingActiveR || (u_cuttingPlaneR.x*ray_sample.x + u_cuttingPlaneR.y*ray_sample.y + u_cuttingPlaneR.z*ray_sample.z + u_cuttingPlaneR.w > 0.0))
        &&(!u_cuttingActiveA || (u_cuttingPlaneA.x*ray_sample.x + u_cuttingPlaneA.y*ray_sample.y + u_cuttingPlaneA.z*ray_sample.z + u_cuttingPlaneA.w > 0.0))
        &&(!u_cuttingActiveP || (u_cuttingPlaneP.x*ray_sample.x + u_cuttingPlaneP.y*ray_sample.y + u_cuttingPlaneP.z*ray_sample.z + u_cuttingPlaneP.w > 0.0))
        &&(!u_cuttingActiveS || (u_cuttingPlaneS.x*ray_sample.x + u_cuttingPlaneS.y*ray_sample.y + u_cuttingPlaneS.z*ray_sample.z + u_cuttingPlaneS.w > 0.0))
        &&(!u_cuttingActiveI || (u_cuttingPlaneI.x*ray_sample.x + u_cuttingPlaneI.y*ray_sample.y + u_cuttingPlaneI.z*ray_sample.z + u_cuttingPlaneI.w > 0.0))){
            
            // Interpolation
            vec3 voxel_sample = (ray_sample + vec3(1.0))/2.0; //Voxel coordinates in texture space [0, 1]
            
            float f = getVoxelValue(voxel_sample);
            
            float value = f;
             if(value < u_threshold_value){
                ray_sample += step_vector;
                vec3 absrs = abs(ray_sample);
                if(absrs.x > 1.0 || absrs.y > 1.0 || absrs.z > 1.0) 
                    break;
                if(color_accumulated.w >= 1.0) 
                    break; 
                continue;
            }

           color_i = texture(u_tf_texture,vec2(value,0.0));
          // color_i = vec4(0.65,0.0,0.0,1.0);
          
            vec3 c = color_i.rgb;
            float op = color_i.a;
            vec3 dimension = vec3(step_length);
            vec3 grad = computeGradientCD(voxel_sample, dimension);
        
            grad_pos= (0.5/step_length) * grad;   
            grad_mag = length(grad_pos);
            grad_mag_nor = normalize(grad_mag);
    
             if (grad_mag > u_gradientThreshold){
                vec3 N = normalize(grad_pos);
                vec3 L = vec3(0.0);
                // calculate direction from the fragment(ray_sample) to the point light
                vec3 lightDirection = light_pos - ray_sample;

                // calculate distance from the fragment to the point light
                float distance = length(lightDirection);

                // normalize the light direction vector
                L = normalize(lightDirection); // default:point light


                // calculate the attenuation factor
                float attenuation = 1.0 / (1.0 + 0.1 * distance + 0.01 * distance * distance);

                if(u_ambient_light){
                    L +=u_amb_fac;
                }
                if(u_directional_light){
                    L = normalize(light_pos); // dircetional light
                }
                if(u_point_light){
                    L = normalize(ray_sample - light_pos); //point light
                }
                color_i = computePhong(N, L, c, op, value, ray_sample);
                color_i.rgb = color_i.rgb/0.512 * attenuation;
           
                hit = true;
                break;
                } 
                                              
     //       }
     }
     ray_sample += step_vector;
    vec3 absrs = abs(ray_sample);
    if(absrs.x > 1.0 || absrs.y > 1.0 || absrs.z > 1.0) break;
} 
    // Final color
    color_final = color_i;
}

\surface_brdf.fs
#version 300 es

#import header

//Implements rayOrigin, interpolationPosition, normalizeVoxel, getVoxel, applyTransferFunction and random functions
#import volume_global_import

void main() {
    // Compute ray origin and direction in volume space [-1,1]
    vec3 ray_origin = u_local_camera_position;
    vec3 ray_exit = v_pos;
    vec3 ray_direction = normalize(ray_exit - ray_origin);

    // Compute ray origin as a point on the volume space (surface or inside)
    ray_origin = rayOrigin(ray_origin, ray_direction);
    vec3 ray_sample = ray_origin;
    vec3 step_vector = ray_direction * u_quality;
    float step_length = length(step_vector);

    // Jittering: Introduce an offset in the ray starting position along the ray direction
    ray_sample += step_vector*random(gl_FragCoord.xy);

    bool hit = false;

    // Initialize cdest vec4 to store color
    vec4 color_accumulated = vec4(0.0);
    vec4 color_step = vec4(0.0);
    vec4 color_i = vec4(0.0);
    vec4 environment_color = vec4(0.0);
    // Light position vector
    vec3 light_pos = vec3(u_x, u_y, u_z);

    // Local variables
    vec3 grad_pos = vec3(0.0);
    float grad_mag = 0.0;
    float grad_mag_nor = 0.0;

    
    vec3 diffuseColor = vec3(1.0, 1.0, 1.0);
    vec3 specularColor = vec3(1.0, 1.0, 1.0);


    vec3 specular = vec3(0.0);
    vec3 diffuse = vec3(0.0);
    vec3 ambient = vec3(0.0);
    float attenuation = 0.0;

    // Use raymarching algorithm
    for(int i=0; i<300; i++){
        if((!u_cuttingActiveL || (u_cuttingPlaneL.x*ray_sample.x + u_cuttingPlaneL.y*ray_sample.y + u_cuttingPlaneL.z*ray_sample.z + u_cuttingPlaneL.w > 0.0))
        &&(!u_cuttingActiveR || (u_cuttingPlaneR.x*ray_sample.x + u_cuttingPlaneR.y*ray_sample.y + u_cuttingPlaneR.z*ray_sample.z + u_cuttingPlaneR.w > 0.0))
        &&(!u_cuttingActiveA || (u_cuttingPlaneA.x*ray_sample.x + u_cuttingPlaneA.y*ray_sample.y + u_cuttingPlaneA.z*ray_sample.z + u_cuttingPlaneA.w > 0.0))
        &&(!u_cuttingActiveP || (u_cuttingPlaneP.x*ray_sample.x + u_cuttingPlaneP.y*ray_sample.y + u_cuttingPlaneP.z*ray_sample.z + u_cuttingPlaneP.w > 0.0))
        &&(!u_cuttingActiveS || (u_cuttingPlaneS.x*ray_sample.x + u_cuttingPlaneS.y*ray_sample.y + u_cuttingPlaneS.z*ray_sample.z + u_cuttingPlaneS.w > 0.0))
        &&(!u_cuttingActiveI || (u_cuttingPlaneI.x*ray_sample.x + u_cuttingPlaneI.y*ray_sample.y + u_cuttingPlaneI.z*ray_sample.z + u_cuttingPlaneI.w > 0.0))){
            
            // Interpolation
            vec3 voxel_sample = (ray_sample + vec3(1.0))/2.0; //Voxel coordinates in texture space [0, 1]
            
            float f = getVoxelValue(voxel_sample);
            
            float value = f;
             if(value < u_threshold_value){
                ray_sample += step_vector;
                vec3 absrs = abs(ray_sample);
                if(absrs.x > 1.0 || absrs.y > 1.0 || absrs.z > 1.0) 
                    break;
                if(color_accumulated.w >= 1.0) 
                    break; 
                continue;
            }
            color_i = texture(u_tf_texture,vec2(value,0.0));
            vec3 c = color_i.rgb;
            float op = color_i.a;

            vec3 dimension = vec3(step_length);
            vec3 grad = computeGradientFD(voxel_sample, dimension);
        
            grad_pos= (0.5/step_length) * grad;   
            grad_mag = length(grad_pos);
            grad_mag_nor = normalize(grad_mag);
    
             if (grad_mag > u_gradientThreshold){
                vec3 N = normalize(grad_pos);
                vec3 L = vec3(0.0);
                // calculate direction from the fragment(ray_sample) to the point light
                vec3 lightDirection = light_pos - ray_sample;

                // calculate distance from the fragment to the point light
                float distance = length(lightDirection);

                // normalize the light direction vector
                L = normalize(lightDirection); // default:point light

                // calculate the attenuation factor
               
                attenuation = 1.0 / (1.0 + 0.1 * distance + 0.01 * distance * distance);
                
            
                if(u_ambient_light){
                    L +=u_amb_fac;
                }
                if(u_directional_light){
                    L = normalize(light_pos); // dircetional light
                }
                if(u_point_light){
                    L = normalize(light_pos - ray_sample); //point light
                }    
                
                color_i.rgb = computeBRDF(N, L, c, op, value, ray_sample);
                color_i.rgb = color_i.rgb/0.512 * attenuation;

                hit = true;
                break;
                }                                
     //       }
     }
     ray_sample += step_vector;
    vec3 absrs = abs(ray_sample);
    if(absrs.x > 1.0 || absrs.y > 1.0 || absrs.z > 1.0) break;
}
   if(!hit) discard;
    // Final color
    
    color_final = vec4(color_i.rgb,1.0);
} 


