import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TOKEN: "@eduspark_student_token",
  STUDENT: "@eduspark_student",
};

export const saveToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.TOKEN, token);
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(KEYS.TOKEN);
};

export const removeToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.TOKEN);
};

export const saveStudent = async (student: unknown): Promise<void> => {
  await AsyncStorage.setItem(KEYS.STUDENT, JSON.stringify(student));
};

export const getStudent = async (): Promise<unknown | null> => {
  const data = await AsyncStorage.getItem(KEYS.STUDENT);
  return data ? JSON.parse(data) : null;
};

export const removeStudent = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.STUDENT);
};

export const clearAuthStorage = async (): Promise<void> => {
  await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.STUDENT]);
};
