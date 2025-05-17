import {
    Alert,
    Button,
    PermissionsAndroid,
    Platform,
    SafeAreaView,
    StyleSheet,
  } from 'react-native';
  import React from 'react';
  import RNFS from 'react-native-fs';
  import Share from 'react-native-share';
  
  type Props = {};
  
  const Home = (props: Props) => {
    // ✅ For Android 10 and below, permission is required to write to Downloads folder
    const requestAndroidPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to your storage to download the file',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    };
  
    // 📂 Download file from app bundle (iOS) or assets (Android)
    const handleDownloadByOffline = async () => {
      const fileName = 'demo.pdf';
  
      try {
        let sourcePath;
        let destinationPath;
  
        if (Platform.OS === 'ios') {
          sourcePath = `${RNFS.MainBundlePath}/${fileName}`;
          destinationPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
  
          const exists = await RNFS.exists(destinationPath);
          if (exists) await RNFS.unlink(destinationPath);
  
          await RNFS.copyFile(sourcePath, destinationPath);
  
          // 📤 Important: iOS requires a share sheet for file access outside the app
          await Share.open({
            url: `file://${destinationPath}`,
            type: 'application/pdf',
            title: 'Save or Share flyerGuide.pdf',
            showAppsToView: true,
          });
        } else {
          const hasPermission = await requestAndroidPermission();
          if (!hasPermission) return;
  
          destinationPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
  
          const exists = await RNFS.exists(destinationPath);
          if (exists) await RNFS.unlink(destinationPath);
  
          // ⚠️ Must match actual file name in android/app/src/main/assets/
          await RNFS.copyFileAssets(fileName, destinationPath);
  
          Alert.alert('Download Complete ✅', `Saved to: Downloads/${fileName}`);
        }
      } catch (err) {
        console.log('Download error:', err);
      }
    };
  
    const url =
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const fileName = 'dummy.pdf';
  
    // 🌐 Download file from a URL to local storage
    const handleDownloadByUrl = async () => {
      try {
        const filePath =
          Platform.OS === 'android'
            ? `${RNFS.DownloadDirectoryPath}/${fileName}`
            : `${RNFS.DocumentDirectoryPath}/${fileName}`;
  
        if (Platform.OS === 'android') {
          const hasPermission = await requestAndroidPermission();
          if (!hasPermission) return;
        }
  
        const result = await RNFS.downloadFile({
          fromUrl: url,
          toFile: filePath,
        }).promise;
  
        if (result.statusCode === 200) {
          if (Platform.OS === 'ios') {
            // 🔄 iOS apps can't expose file paths without sharing
            await Share.open({
              url: 'file://' + filePath,
              type: 'application/pdf',
            });
          } else {
            Alert.alert('Download Complete', `Saved to Downloads:\n${filePath}`);
          }
        } else {
          throw new Error('Download failed with status ' + result.statusCode);
        }
      } catch (error) {
        console.error('File error:', error);
        Alert.alert('Error', 'Something went wrong');
      }
    };
  
    // 📦 Use this when API returns blob (e.g., from fetch or axios)
    // ⚠️ Important: blob must be passed from fetch response as-is
    const handleDownloadByBlob = async ({
      blob,
      fileName,
      mimeType = 'application/octet-stream',
    }) => {
      try {
        const reader = new FileReader();
  
        return new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64data = reader.result.split(',')[1];
  
              if (Platform.OS === 'android') {
                const hasPermission = await requestAndroidPermission();
                if (!hasPermission) {
                  return reject('Permission denied');
                }
              }
  
              const path =
                Platform.OS === 'android'
                  ? `${RNFS.DownloadDirectoryPath}/${fileName}`
                  : `${RNFS.DocumentDirectoryPath}/${fileName}`;
  
              await RNFS.writeFile(path, base64data, 'base64');
  
              if (Platform.OS === 'ios') {
                // 🧷 iOS sandboxed: share required to move file to user-accessible place
                await Share.open({
                  url: 'file://' + path,
                  type: mimeType,
                  failOnCancel: false,
                });
              } else {
                Alert.alert('Download Complete', `File saved to Downloads:\n${fileName}`);
              }
  
              resolve(path);
            } catch (err) {
              console.error('File write error:', err);
              reject(err);
            }
          };
  
          reader.onerror = e => {
            console.error('FileReader error:', e);
            reject(e);
          };
  
          // 🧠 Converts blob to base64 in JS — required for RNFS writeFile
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Blob handling error:', error);
        throw error;
      }
    };
  
    return (
      <SafeAreaView>
        <Button onPress={handleDownloadByOffline} title="DownloadOffline" />
        <Button onPress={handleDownloadByUrl} title="DownloadByUrl" />
        {/* 👇 Note: Pass blob and filename when using this */}
        {/* <Button
          pass blob which return by api 
          onPress={() =>
            handleDownloadByBlob({
              blob: new Blob(['Hello from blob!'], { type: 'application/pdf' }),
              fileName: `custom_${Date.now()}.pdf`,
              mimeType: 'application/pdf',
            })
          }
          title="DownloadByBlob"
        /> */}
      </SafeAreaView>
    );
  };
  
  export default Home;
  
  const styles = StyleSheet.create({});
  