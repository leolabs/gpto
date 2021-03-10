export interface MetadataFile {
  title: string;
  description: string;
  imageViews: string;
  creationTime: CreationTime;
  photoTakenTime: PhotoTakenTime;
  geoData: GeoData;
  geoDataExif: GeoDataExif;
  people?: PeopleItem[];
  googlePhotosOrigin: GooglePhotosOrigin;
  favorited?: boolean;
}

interface CreationTime {
  timestamp: string;
  formatted: string;
}

interface PhotoTakenTime {
  timestamp: string;
  formatted: string;
}

interface GeoData {
  latitude: number;
  longitude: number;
  altitude: number;
  latitudeSpan: number;
  longitudeSpan: number;
}

interface GeoDataExif {
  latitude: number;
  longitude: number;
  altitude: number;
  latitudeSpan: number;
  longitudeSpan: number;
}

interface PeopleItem {
  name: string;
}

interface GooglePhotosOrigin {
  mobileUpload?: MobileUpload;
  driveDesktopUploader?: any;
  webUpload?: WebUpload;
  fromSharedAlbum?: any;
  composition?: Composition;
}

interface MobileUpload {
  deviceFolder?: DeviceFolder;
  deviceType: string;
}

interface DeviceFolder {
  localFolderName: string;
}

interface WebUpload {
  computerUpload: any;
}

interface Composition {
  type: string;
}
